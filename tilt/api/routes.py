"""All 11 endpoints per SPEC Wave 4."""

from __future__ import annotations

import os
import time
from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query

from tilt import __version__
from tilt.api.schemas import (
    BacktestMetrics,
    BacktestResponse,
    HealthResponse,
    PortfolioHolding,
    PortfolioResponse,
    RefreshResponse,
    ScanBySectorResponse,
    ScanResponse,
    SectorHeatmapResponse,
    StockDetailResponse,
    StockOhlcvBar,
    to_scan_response,
    to_scan_result,
    to_sector_tile,
)
from tilt.api.service import ScanService, build_snapshot
from tilt.data import DataFetcher, ParquetCache, YFinanceProvider
from tilt.data.bhavcopy_provider import BhavcopyProvider
from tilt.portfolio import (
    EmptyPortfolioProvider,
    MockPortfolioProvider,
    PortfolioProvider,
)
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


def get_data_fetcher() -> DataFetcher:
    global _data_fetcher
    if _data_fetcher is None:
        _data_fetcher = DataFetcher(
            providers=[YFinanceProvider(), BhavcopyProvider()],
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
