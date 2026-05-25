"""Dataclasses crossing the signal-engine boundary.

These are the structs the API layer will serialize. Keeping them as frozen
dataclasses (not Pydantic) avoids an unnecessary runtime-validation pass
through hot signal-evaluation code; the API layer wraps these in Pydantic
response models at step 8.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class IndicatorSnapshot:
    """Indicator values at the latest bar of a price series.

    All values are *derived* from OHLCV in ``engine.build_snapshot``; filters
    and scorers consume snapshots and never touch raw price data directly.
    """

    rsi: float
    macd: float
    macd_signal: float
    macd_hist: float
    ema20: float
    pct_below_52w_high: float
    macd_crossover_days_ago: int | None  # None if no crossover in lookback window
    macd_hist_rising: bool


@dataclass(frozen=True)
class ScoreBreakdown:
    """Weighted contributions to the composite score.

    Per SPEC Wave 3, weights are 0.35 / 0.25 / 0.20 / 0.20. These are the
    *post-weight* contributions (so they sum to ``total`` directly) — that's
    what the API contract's ``score_breakdown`` field demands, and what reads
    cleanly in the demo's explainability beat.
    """

    momentum: float
    upside: float
    rsi: float
    sector: float

    @property
    def total(self) -> float:
        return self.momentum + self.upside + self.rsi + self.sector


@dataclass(frozen=True)
class SignalResult:
    """One row in a scan response — matches the locked API contract in CLAUDE.md."""

    ticker: str
    name: str
    cmp: float
    score: float
    score_breakdown: ScoreBreakdown
    indicators: IndicatorSnapshot
    sector: str
    sector_tag: str  # "Hot" | "Neutral" | "Cold"
    filter_triggers: tuple[str, ...] = field(default_factory=tuple)
