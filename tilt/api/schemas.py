"""Pydantic response models — the wire contract for the API.

Mirrors the dataclasses from ``tilt.signals.models`` and ``tilt.sectors``, but
with FastAPI/Pydantic semantics (validation, OpenAPI generation). The
``_to_*`` converters do the dataclass → model transform exactly once per
response so endpoint handlers stay thin.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from pydantic import BaseModel, Field

from tilt.sectors import SectorRanking
from tilt.signals import SignalResult

_DEFAULT_STALENESS = timedelta(minutes=15)


# --- Atomic shapes ---------------------------------------------------------


class IndicatorsResponse(BaseModel):
    rsi: float
    macd: float
    macd_signal: float
    macd_hist: float
    ema20: float
    pct_below_52w_high: float


class ScoreBreakdownResponse(BaseModel):
    momentum: float
    upside: float
    rsi: float
    sector: float


class ScanResult(BaseModel):
    ticker: str
    name: str
    cmp: float
    score: float
    score_breakdown: ScoreBreakdownResponse
    indicators: IndicatorsResponse
    sector: str
    sector_tag: str
    filter_triggers: list[str]


# --- Envelopes -------------------------------------------------------------


class ScanResponse(BaseModel):
    generated_at: datetime
    stale_after: datetime
    count: int
    results: list[ScanResult]


class ScanBySectorResponse(BaseModel):
    generated_at: datetime
    stale_after: datetime
    sectors: dict[str, list[ScanResult]]


class SectorTile(BaseModel):
    sector_name: str
    display_name: str
    momentum: float
    rank: int
    tag: str
    passing_count: int = Field(0, description="rally passes in this sector")


class SectorHeatmapResponse(BaseModel):
    generated_at: datetime
    sectors: list[SectorTile]


class PortfolioHolding(BaseModel):
    ticker: str
    name: str
    quantity: int
    avg_buy_price: float
    cmp: float
    pnl_abs: float
    pnl_pct: float
    status: str  # "Hold" | "Average" | "Sell"
    reason: str
    sector: str
    sector_tag: str
    filter_triggers: list[str]


class PortfolioResponse(BaseModel):
    generated_at: datetime
    count: int
    total_invested: float
    cash: float
    holdings: list[PortfolioHolding]


class StockOhlcvBar(BaseModel):
    date: str  # ISO date
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockDetailResponse(BaseModel):
    ticker: str
    name: str
    cmp: float
    sector: str
    sector_tag: str
    indicator_series: dict[str, list[float | None]]
    ohlcv: list[StockOhlcvBar]


class BacktestMetrics(BaseModel):
    triggers: int
    hit_rate_30d: float
    avg_fwd_return_30d: float
    max_drawdown_per_signal: float


class BacktestResponse(BaseModel):
    start: str
    end: str
    universe_size: int
    metrics: BacktestMetrics


class MFContextSchema(BaseModel):
    funds_count: int
    fund_short_names: list[str]
    smart_money_cr: float


class RecommendationCard(BaseModel):
    ticker: str
    name: str
    cmp: float
    score: float
    lane: str  # 'strong' | 'momentum' | 'value' | 'smart_money'
    sector: str
    sector_id: str
    sector_tag: str
    indicators: dict[str, float]
    score_breakdown: dict[str, float]
    pros: list[str]
    cons: list[str]
    mf_context: MFContextSchema | None = None


class RecommendationsResponse(BaseModel):
    generated_at: datetime
    stale_after: datetime
    counts: dict[str, int]  # {"strong": N, "momentum": N, "value": N, "smart_money": N}
    cards: list[RecommendationCard]
    tracked_funds: list[str] = []  # short names of MFs whose holdings were scanned
    lane_reasons: dict[str, str] = {}  # lane_id → "why empty" plain-English explanation


class RefreshResponse(BaseModel):
    refreshed_at: datetime
    duration_seconds: float
    tickers_requested: int
    tickers_fetched: int
    cache_hits: int
    providers_used: dict[str, str]
    missing: list[str]


class HealthResponse(BaseModel):
    status: str
    version: str


# --- Converters ------------------------------------------------------------


def _now_utc() -> datetime:
    return datetime.now(UTC)


def to_scan_result(sr: SignalResult) -> ScanResult:
    return ScanResult(
        ticker=sr.ticker,
        name=sr.name,
        cmp=sr.cmp,
        score=sr.score,
        score_breakdown=ScoreBreakdownResponse(
            momentum=sr.score_breakdown.momentum,
            upside=sr.score_breakdown.upside,
            rsi=sr.score_breakdown.rsi,
            sector=sr.score_breakdown.sector,
        ),
        indicators=IndicatorsResponse(
            rsi=sr.indicators.rsi,
            macd=sr.indicators.macd,
            macd_signal=sr.indicators.macd_signal,
            macd_hist=sr.indicators.macd_hist,
            ema20=sr.indicators.ema20,
            pct_below_52w_high=sr.indicators.pct_below_52w_high,
        ),
        sector=sr.sector,
        sector_tag=sr.sector_tag,
        filter_triggers=list(sr.filter_triggers),
    )


def to_scan_response(results: list[SignalResult]) -> ScanResponse:
    now = _now_utc()
    return ScanResponse(
        generated_at=now,
        stale_after=now + _DEFAULT_STALENESS,
        count=len(results),
        results=[to_scan_result(r) for r in results],
    )


def to_sector_tile(r: SectorRanking, passing_count: int = 0) -> SectorTile:
    return SectorTile(
        sector_name=r.sector_name,
        display_name=r.display_name,
        momentum=r.momentum,
        rank=r.rank,
        tag=r.tag,
        passing_count=passing_count,
    )
