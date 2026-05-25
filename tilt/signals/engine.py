"""Signal engine orchestrator.

Takes a list of ``ScanInput`` (one per ticker with pre-attached sector context)
and emits ranked ``SignalResult`` rows for each filter. The API layer wraps
``run_rally_scan`` etc. and serializes the results.

Snapshot construction lives here (``build_snapshot``) rather than in the
indicators module because it composes multiple indicators + a 52-week window
calc + crossover detection — none of which are single-indicator concerns.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from tilt.indicators import macd, rsi
from tilt.signals.filters import (
    evaluate_averaging,
    evaluate_rally,
    evaluate_trap,
)
from tilt.signals.models import IndicatorSnapshot, SignalResult
from tilt.signals.score import build_score

_CROSSOVER_LOOKBACK = 30  # bars to look back for the most recent MACD crossover
_HIST_RISING_LOOKBACK = 3  # bars over which macd_hist must monotonically rise
_TRADING_DAYS_PER_YEAR = 252


@dataclass(frozen=True)
class ScanInput:
    """One unit of scan input — ticker plus the data needed to rank it."""

    ticker: str
    name: str
    close: pd.Series
    sector: str
    sector_tag: str  # "Hot" | "Neutral" | "Cold"
    sector_strength: float  # [0, 1] from sector-rotation overlay
    avg_buy: float | None = None  # only needed by averaging scan


def build_snapshot(close: pd.Series) -> IndicatorSnapshot | None:
    """Compute the indicator snapshot for the latest *valid* bar of ``close``.

    yfinance can return a trailing NaN for the current (incomplete) trading
    day, AND occasionally returns an all-NaN series for a ticker (delisted
    mid-window, fetch hiccup, etc). We trim to the last valid index before
    every latest-bar read. Returns ``None`` if no valid bar exists — callers
    should treat that as "skip this ticker," not a hard error.
    """
    last_valid = close.last_valid_index()
    if last_valid is None:
        return None
    close_trimmed = close.loc[:last_valid]

    rsi_series = rsi(close_trimmed, length=14)
    macd_df = macd(close_trimmed, fast=12, slow=26, signal=9)
    ema20 = close_trimmed.ewm(span=20, adjust=False).mean()

    cmp = float(close_trimmed.iloc[-1])
    window = min(_TRADING_DAYS_PER_YEAR, len(close_trimmed))
    high_52w = float(close_trimmed.iloc[-window:].max())
    pct_below = (high_52w - cmp) / high_52w if high_52w > 0 else 0.0

    macd_hist = macd_df["histogram"]

    return IndicatorSnapshot(
        rsi=float(rsi_series.iloc[-1]),
        macd=float(macd_df["macd"].iloc[-1]),
        macd_signal=float(macd_df["signal"].iloc[-1]),
        macd_hist=float(macd_hist.iloc[-1]),
        ema20=float(ema20.iloc[-1]),
        pct_below_52w_high=float(pct_below),
        macd_crossover_days_ago=_detect_crossover_days_ago(macd_hist),
        macd_hist_rising=_is_monotonically_rising(macd_hist, _HIST_RISING_LOOKBACK),
    )


def _detect_crossover_days_ago(hist: pd.Series) -> int | None:
    """Return bars since macd_hist crossed from ≤0 to >0 (None if no crossover in lookback)."""
    valid = hist.dropna()
    if len(valid) < 2:
        return None
    tail = valid.iloc[-_CROSSOVER_LOOKBACK:]
    prev = tail.shift(1)
    crossed = (tail > 0) & (prev <= 0)
    if not crossed.any():
        return None
    # Days since last True, counting from the last bar.
    crossed_positions = [i for i, v in enumerate(crossed.values) if v]
    last_pos = crossed_positions[-1]
    return len(tail) - 1 - last_pos


def _is_monotonically_rising(series: pd.Series, lookback: int) -> bool:
    """True iff the last ``lookback+1`` non-NaN values are non-decreasing."""
    valid = series.dropna()
    if len(valid) < lookback + 1:
        return False
    tail = valid.iloc[-(lookback + 1) :]
    return all(tail.iloc[i] >= tail.iloc[i - 1] for i in range(1, len(tail)))


# --- Public scan functions --------------------------------------------------


def run_rally_scan(inputs: list[ScanInput]) -> list[SignalResult]:
    """Run the Rally filter over all inputs; return passing rows sorted by score desc."""
    results: list[SignalResult] = []
    for inp in inputs:
        snap = build_snapshot(inp.close)
        if snap is None:
            continue
        cmp = float(inp.close.dropna().iloc[-1])
        verdict = evaluate_rally(snap, cmp)
        if not verdict.passed:
            continue
        breakdown = build_score(snap, cmp, inp.sector_strength)
        results.append(
            SignalResult(
                ticker=inp.ticker,
                name=inp.name,
                cmp=cmp,
                score=breakdown.total,
                score_breakdown=breakdown,
                indicators=snap,
                sector=inp.sector,
                sector_tag=inp.sector_tag,
                filter_triggers=verdict.triggers,
            )
        )
    return sorted(results, key=lambda r: -r.score)


def run_averaging_scan(inputs: list[ScanInput]) -> list[SignalResult]:
    """Run the Averaging filter — requires inputs to have ``avg_buy`` set."""
    results: list[SignalResult] = []
    for inp in inputs:
        snap = build_snapshot(inp.close)
        if snap is None:
            continue
        cmp = float(inp.close.dropna().iloc[-1])
        verdict = evaluate_averaging(snap, cmp, inp.avg_buy)
        if not verdict.passed:
            continue
        breakdown = build_score(snap, cmp, inp.sector_strength)
        results.append(
            SignalResult(
                ticker=inp.ticker,
                name=inp.name,
                cmp=cmp,
                score=breakdown.total,
                score_breakdown=breakdown,
                indicators=snap,
                sector=inp.sector,
                sector_tag=inp.sector_tag,
                filter_triggers=verdict.triggers,
            )
        )
    return sorted(results, key=lambda r: -r.score)


def run_trap_scan(inputs: list[ScanInput]) -> list[SignalResult]:
    """Run the Trap filter — sell-side signal for portfolio holdings."""
    results: list[SignalResult] = []
    for inp in inputs:
        snap = build_snapshot(inp.close)
        if snap is None:
            continue
        cmp = float(inp.close.dropna().iloc[-1])
        verdict = evaluate_trap(snap)
        if not verdict.passed:
            continue
        breakdown = build_score(snap, cmp, inp.sector_strength)
        results.append(
            SignalResult(
                ticker=inp.ticker,
                name=inp.name,
                cmp=cmp,
                score=breakdown.total,
                score_breakdown=breakdown,
                indicators=snap,
                sector=inp.sector,
                sector_tag=inp.sector_tag,
                filter_triggers=verdict.triggers,
            )
        )
    return sorted(results, key=lambda r: -r.score)
