"""All 11 endpoints per SPEC Wave 4."""

from __future__ import annotations

import os
import time
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query

from tilt import __version__
from tilt.api.brief import build_brief_from_service
from tilt.api.diagnostics import compute_universe_stats, explain_empty_lane
from tilt.api.recommendations import build_recommendation
from tilt.api.schemas import (
    BacktestMetrics,
    BacktestResponse,
    BriefPickSchema,
    BriefResponse,
    BriefSectorSchema,
    HealthResponse,
    MFContextSchema,
    PortfolioHolding,
    PortfolioResponse,
    RecommendationCard,
    RecommendationsResponse,
    RefreshResponse,
    ScanBySectorResponse,
    ScanResponse,
    ScanStatsSchema,
    SectorHeatmapResponse,
    StockDetailResponse,
    StockOhlcvBar,
    to_scan_response,
    to_scan_result,
    to_sector_tile,
)
from tilt.api.service import ScanService, build_snapshot
from tilt.data import DataFetcher, ParquetCache, SnapshotProvider, YFinanceProvider
from tilt.data.bhavcopy_provider import BhavcopyProvider
from tilt.funds import load_mf_holdings, smart_money_context
from tilt.llm import LLMProvider, get_default_provider
from tilt.portfolio import (
    EmptyPortfolioProvider,
    MockPortfolioProvider,
    PortfolioProvider,
)
from tilt.signals import build_snapshot as _build_snap
from tilt.signals import (
    evaluate_averaging,
    evaluate_rally,
    evaluate_trap,
)

router = APIRouter()

# --- Dependency-injected singletons ---

_data_fetcher: DataFetcher | None = None
_portfolio_provider: PortfolioProvider | None = None
_scan_service: ScanService | None = None
_llm_provider: LLMProvider | None = None


def get_data_fetcher() -> DataFetcher:
    """Build the DataFetcher.

    Provider chain selected by ``MARKET_DATA_PROVIDER`` env var:
    - ``snapshot`` (default for demos) — reads frozen parquet snapshot
      under ``data/snapshot/``. Deterministic, fast, no network. Date in
      ``data/snapshot/manifest.json``. Refresh with
      ``python scripts/capture_snapshot.py YYYY-MM-DD``.
    - ``yfinance`` — live yfinance with bhavcopy fallback. Production path,
      rate-limited on Render free tier.
    """
    global _data_fetcher
    if _data_fetcher is None:
        choice = os.getenv("MARKET_DATA_PROVIDER", "snapshot").lower()
        if choice == "yfinance":
            providers = [YFinanceProvider(), BhavcopyProvider()]
        else:
            providers = [SnapshotProvider()]
        _data_fetcher = DataFetcher(
            providers=providers,
            cache=ParquetCache(Path("data/cache")),
        )
    return _data_fetcher


def get_portfolio_provider() -> PortfolioProvider:
    """Pick the portfolio provider from ``PORTFOLIO_PROVIDER`` env var.

    - ``mock`` (default) — reads ``data/mock_portfolio.json``.
    - ``empty`` — returns no holdings (used by tests + empty-state demos).
    - ``groww`` — live Groww API (lands at step 17, not yet implemented).
    """
    global _portfolio_provider
    if _portfolio_provider is None:
        choice = os.getenv("PORTFOLIO_PROVIDER", "mock").lower()
        if choice == "empty":
            _portfolio_provider = EmptyPortfolioProvider()
        elif choice == "groww":
            raise NotImplementedError(
                "GrowwPortfolioProvider lands at step 17. Set PORTFOLIO_PROVIDER=mock."
            )
        else:
            _portfolio_provider = MockPortfolioProvider()
    return _portfolio_provider


def get_scan_service(fetcher: DataFetcher = Depends(get_data_fetcher)) -> ScanService:
    global _scan_service
    if _scan_service is None:
        _scan_service = ScanService(fetcher)
    return _scan_service


def get_llm_provider() -> LLMProvider:
    """Pick the LLM narrative provider — Gemini if key set, deterministic otherwise.

    Both produce identical response shapes; the frontend renders the same way
    regardless. Override in tests via ``app.dependency_overrides``.
    """
    global _llm_provider
    if _llm_provider is None:
        _llm_provider = get_default_provider()
    return _llm_provider


# --- Endpoints ---


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", version=__version__)


@router.post("/refresh", response_model=RefreshResponse)
def refresh(svc: ScanService = Depends(get_scan_service)) -> RefreshResponse:
    started = time.monotonic()
    _, fetch_result = svc.refresh(force_refresh=True)
    elapsed = time.monotonic() - started
    return RefreshResponse(
        refreshed_at=datetime.now(UTC),
        duration_seconds=round(elapsed, 2),
        tickers_requested=len({*fetch_result.data.keys(), *fetch_result.missing}),
        tickers_fetched=fetch_result.count,
        cache_hits=fetch_result.cache_hits,
        providers_used=fetch_result.providers_used,
        missing=fetch_result.missing,
    )


@router.get("/scan/rally", response_model=ScanResponse)
def scan_rally(
    limit: int = Query(20, ge=1, le=200),
    svc: ScanService = Depends(get_scan_service),
) -> ScanResponse:
    snapshot, _ = svc.refresh()
    return to_scan_response(svc.rally(snapshot, limit=limit))


@router.get("/scan/rally/conviction", response_model=ScanResponse)
def scan_rally_conviction(svc: ScanService = Depends(get_scan_service)) -> ScanResponse:
    snapshot, _ = svc.refresh()
    return to_scan_response(svc.rally_conviction(snapshot, limit=5))


@router.get("/scan/rally/by-sector", response_model=ScanBySectorResponse)
def scan_rally_by_sector(
    svc: ScanService = Depends(get_scan_service),
) -> ScanBySectorResponse:
    snapshot, _ = svc.refresh()
    bucketed = svc.rally_by_sector(snapshot, per_sector_limit=5)
    now = datetime.now(UTC)
    return ScanBySectorResponse(
        generated_at=now,
        stale_after=now,
        sectors={k: [to_scan_result(r) for r in v] for k, v in bucketed.items()},
    )


@router.get("/scan/recommendations", response_model=RecommendationsResponse)
def scan_recommendations(svc: ScanService = Depends(get_scan_service)) -> RecommendationsResponse:
    """4-lane recommendations: Strong / Momentum / Value / Smart Money.

    Single-lane assignment per stock (Strong > Momentum > Value > Smart Money).
    Pros and cons are derived from the indicator snapshot — no LLM.
    MF context (funds holding, smart money exposure) attached to every card
    where applicable, regardless of which lane the stock landed in.
    """
    snapshot, _ = svc.refresh()
    funds = load_mf_holdings()
    cards: list[RecommendationCard] = []
    # Collect snapshots for diagnostics — same compute as build_recommendation
    # but we hold onto them to compute universe-wide stats for empty-state reasons.
    diag_snaps: list[tuple] = []
    for ticker, close in snapshot.closes.items():
        sector_ranking = snapshot.sector_by_ticker.get(ticker)
        if sector_ranking is None:
            continue
        # Pre-build snapshot for diagnostics (re-built inside build_recommendation —
        # tiny duplication, kept for clarity).
        try:
            snap = _build_snap(close)
            if snap is not None:
                cmp_val = float(close.dropna().iloc[-1])
                diag_snaps.append((snap, cmp_val))
        except Exception:
            pass
        mf_ctx = smart_money_context(ticker, funds)
        rec = build_recommendation(
            ticker=ticker,
            name=snapshot.name_by_ticker.get(ticker, ticker),
            close=close,
            sector=sector_ranking.display_name,
            sector_id=sector_ranking.sector_name,
            sector_tag=sector_ranking.tag,
            sector_strength=sector_ranking.momentum,
            mf_ctx=mf_ctx,
        )
        if rec is None:
            continue
        cards.append(
            RecommendationCard(
                ticker=rec.ticker,
                name=rec.name,
                cmp=rec.cmp,
                score=rec.score,
                lane=rec.lane,
                sector=rec.sector,
                sector_id=rec.sector_id,
                sector_tag=rec.sector_tag,
                indicators=rec.indicators,
                score_breakdown=rec.score_breakdown,
                pros=rec.pros,
                cons=rec.cons,
                mf_context=MFContextSchema(**rec.mf_context) if rec.mf_context else None,
            )
        )
    cards.sort(key=lambda c: -c.score)
    counts = {
        "strong": sum(1 for c in cards if c.lane == "strong"),
        "momentum": sum(1 for c in cards if c.lane == "momentum"),
        "value": sum(1 for c in cards if c.lane == "value"),
        "smart_money": sum(1 for c in cards if c.lane == "smart_money"),
    }

    # For each empty lane, generate a plain-English "why" from universe stats.
    stats = compute_universe_stats(diag_snaps)
    mf_tracked_count = sum(len(f.holdings) for f in funds)
    lane_reasons: dict[str, str] = {}
    for lane_id, count in counts.items():
        if count == 0:
            lane_reasons[lane_id] = explain_empty_lane(lane_id, stats, mf_tracked=mf_tracked_count)

    now = datetime.now(UTC)

    # Surface snapshot metadata so the frontend hero can display "Data as of
    # March 27, 2026" alongside the refresh timestamp. Only populated when
    # MARKET_DATA_PROVIDER=snapshot is active.
    snapshot_date: str | None = None
    data_mode = "live"
    for provider in svc.fetcher.providers:
        if isinstance(provider, SnapshotProvider):
            try:
                snapshot_date = provider.snapshot_date.isoformat()
                data_mode = "snapshot"
            except Exception:
                pass
            break

    return RecommendationsResponse(
        generated_at=now,
        stale_after=now,
        counts=counts,
        cards=cards,
        tracked_funds=[f.short_name for f in funds],
        lane_reasons=lane_reasons,
        snapshot_date=snapshot_date,
        data_mode=data_mode,
    )


@router.get("/scan/brief", response_model=BriefResponse)
def scan_brief(
    svc: ScanService = Depends(get_scan_service),
    llm: LLMProvider = Depends(get_llm_provider),
) -> BriefResponse:
    """V3 daily-brief shape: market read paragraph + hero pick + supporting list.

    Composes the published-brief view from the same recommendation engine
    powering ``/scan/recommendations``. The narrative layer (thesis text,
    market-read paragraph) is generated by the configured ``LLMProvider`` —
    Gemini Flash when ``GEMINI_API_KEY`` is set, deterministic templates
    otherwise. The response shape is identical either way; ``llm_provider``
    in the body surfaces which path ran.
    """
    now = datetime.now(UTC)
    brief = build_brief_from_service(svc, llm_provider=llm, generated_at=now.isoformat())

    sectors_payload: list[BriefSectorSchema] = []
    for ranking in sorted(svc.refresh()[0].rankings, key=lambda r: r.rank):
        sectors_payload.append(
            BriefSectorSchema(
                name=ranking.display_name,
                momentum=ranking.momentum,
                rank=ranking.rank,
                state=ranking.tag.lower(),
            )
        )

    def _to_schema(pick) -> BriefPickSchema:
        return BriefPickSchema(
            ticker=pick.ticker,
            name=pick.name,
            lane=pick.lane,
            cmp=pick.cmp,
            score=pick.score,
            sector=pick.sector,
            sector_tag=pick.sector_tag,
            indicators=pick.indicators,
            score_breakdown=pick.score_breakdown,
            pros=pick.pros,
            cons=pick.cons,
            mf_context=MFContextSchema(**pick.mf_context) if pick.mf_context else None,
            thesis=pick.thesis,
            thesis_short=pick.thesis_short,
            why_this=pick.why_this,
            fund_blurbs=pick.fund_blurbs,
            projections=pick.projections,
        )

    return BriefResponse(
        snapshot_date=brief.snapshot_date,
        generated_at=now,
        market_read=brief.market_read,
        scan_stats=ScanStatsSchema(
            tickers_scanned=brief.tickers_scanned,
            total_picks=brief.total_picks,
            lane_counts=brief.lane_counts,
        ),
        hero=_to_schema(brief.hero) if brief.hero else None,
        supporting=[_to_schema(p) for p in brief.supporting],
        sectors=sectors_payload,
        llm_provider=brief.llm_provider,
        data_mode=brief.data_mode,
    )


@router.get("/sectors/heatmap", response_model=SectorHeatmapResponse)
def sectors_heatmap(svc: ScanService = Depends(get_scan_service)) -> SectorHeatmapResponse:
    snapshot, _ = svc.refresh()
    rally_passes = svc.rally(snapshot)
    counts: dict[str, int] = {}
    for r in rally_passes:
        counts[r.sector] = counts.get(r.sector, 0) + 1
    tiles = [
        to_sector_tile(r, passing_count=counts.get(r.display_name, 0)) for r in snapshot.rankings
    ]
    return SectorHeatmapResponse(generated_at=datetime.now(UTC), sectors=tiles)


@router.get("/portfolio", response_model=PortfolioResponse)
def portfolio(
    svc: ScanService = Depends(get_scan_service),
    portfolio_provider: PortfolioProvider = Depends(get_portfolio_provider),
) -> PortfolioResponse:
    pf = portfolio_provider.get_portfolio()
    snapshot, _ = svc.refresh()
    holdings: list[PortfolioHolding] = []
    for holding in pf.holdings:
        if holding.ticker not in snapshot.closes:
            continue
        close_series = snapshot.closes[holding.ticker]
        cmp = float(close_series.iloc[-1])
        snap = build_snapshot(close_series)
        sector_ranking = snapshot.sector_by_ticker.get(holding.ticker)
        sector_display = sector_ranking.display_name if sector_ranking else "—"
        sector_tag = sector_ranking.tag if sector_ranking else "Neutral"

        # Determine status: trap (Sell) > averaging (Average) > Hold
        trap = evaluate_trap(snap)
        avg = evaluate_averaging(snap, cmp, holding.avg_buy_price)
        if trap.passed:
            status = "Sell"
            reason = ", ".join(trap.triggers)
            triggers = list(trap.triggers)
        elif avg.passed:
            status = "Average"
            reason = ", ".join(avg.triggers)
            triggers = list(avg.triggers)
        else:
            status = "Hold"
            reason = "no exit/averaging triggers fired"
            triggers = []

        pnl_abs = (cmp - holding.avg_buy_price) * holding.quantity
        pnl_pct = ((cmp / holding.avg_buy_price) - 1.0) * 100.0 if holding.avg_buy_price else 0.0
        holdings.append(
            PortfolioHolding(
                ticker=holding.ticker,
                name=snapshot.name_by_ticker.get(holding.ticker, holding.ticker),
                quantity=holding.quantity,
                avg_buy_price=holding.avg_buy_price,
                cmp=cmp,
                pnl_abs=pnl_abs,
                pnl_pct=pnl_pct,
                status=status,
                reason=reason,
                sector=sector_display,
                sector_tag=sector_tag,
                filter_triggers=triggers,
            )
        )
    # Sort: Sell first, then Average, then Hold (urgent first)
    order = {"Sell": 0, "Average": 1, "Hold": 2}
    holdings.sort(key=lambda h: order.get(h.status, 3))
    return PortfolioResponse(
        generated_at=datetime.now(UTC),
        count=len(holdings),
        total_invested=pf.total_invested,
        cash=pf.cash,
        holdings=holdings,
    )


@router.get("/scan/averaging", response_model=ScanResponse)
def scan_averaging(
    svc: ScanService = Depends(get_scan_service),
    portfolio_provider: PortfolioProvider = Depends(get_portfolio_provider),
) -> ScanResponse:
    pf = portfolio_provider.get_portfolio()
    snapshot, _ = svc.refresh()
    avg_buys = {h.ticker: h.avg_buy_price for h in pf.holdings}
    return to_scan_response(svc.averaging_for_holdings(snapshot, avg_buys))


@router.get("/scan/traps", response_model=ScanResponse)
def scan_traps(
    svc: ScanService = Depends(get_scan_service),
    portfolio_provider: PortfolioProvider = Depends(get_portfolio_provider),
) -> ScanResponse:
    pf = portfolio_provider.get_portfolio()
    snapshot, _ = svc.refresh()
    return to_scan_response(svc.traps_for_holdings(snapshot, list(pf.ticker_set())))


@router.post("/backtest/rally", response_model=BacktestResponse)
def backtest_rally(start: str, end: str) -> BacktestResponse:
    # Real backtest engine lands at step 9; this stub returns the response shape
    # so the frontend can wire against the contract.
    return BacktestResponse(
        start=start,
        end=end,
        universe_size=0,
        metrics=BacktestMetrics(
            triggers=0,
            hit_rate_30d=0.0,
            avg_fwd_return_30d=0.0,
            max_drawdown_per_signal=0.0,
        ),
    )


@router.get("/stock/{ticker}", response_model=StockDetailResponse)
def stock_detail(ticker: str, svc: ScanService = Depends(get_scan_service)) -> StockDetailResponse:
    snapshot, _ = svc.refresh()
    bundle = svc.stock_detail(snapshot, ticker)
    if bundle is None:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker!r} not found in cache")
    info, ohlcv_df, scan_input = bundle

    # Indicator series for the chart overlay.
    close = scan_input.close
    rsi_vals = None
    macd_hist_vals = None
    ema20_vals = None
    from tilt.indicators import macd as macd_fn
    from tilt.indicators import rsi as rsi_fn

    rsi_series = rsi_fn(close)
    macd_df = macd_fn(close)
    ema20 = close.ewm(span=20, adjust=False).mean()

    rsi_vals = [None if v != v else float(v) for v in rsi_series.tolist()]
    macd_hist_vals = [None if v != v else float(v) for v in macd_df["histogram"].tolist()]
    ema20_vals = [None if v != v else float(v) for v in ema20.tolist()]

    bars = [
        StockOhlcvBar(
            date=idx.date().isoformat(),
            open=float(row["open"]),
            high=float(row["high"]),
            low=float(row["low"]),
            close=float(row["close"]),
            volume=int(row["volume"]),
        )
        for idx, row in ohlcv_df.iterrows()
    ]
    return StockDetailResponse(
        ticker=ticker.upper(),
        name=info.name if info else ticker.upper(),
        cmp=float(close.iloc[-1]),
        sector=scan_input.sector,
        sector_tag=scan_input.sector_tag,
        indicator_series={
            "rsi": rsi_vals,
            "macd_hist": macd_hist_vals,
            "ema20": ema20_vals,
        },
        ohlcv=bars,
    )


# Quiet ruff for unused import — used inside stock_detail.
_ = evaluate_rally
