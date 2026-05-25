"""Why-is-this-lane-empty diagnostics.

When a lane returns zero picks, the dashboard should explain *why* in plain
English — not just "no setups today." We compute the explanation from real
universe-wide indicator stats, so the reason is always grounded in actual
numbers ("82% of stocks have RSI > 62") rather than a hardcoded template.

For each lane, we identify which of its required conditions is most-violated
across the universe, and write that as the dominant reason. If multiple
conditions are widely violated, we cite the two strongest.
"""

from __future__ import annotations

from dataclasses import dataclass

from tilt.api.recommendations import (
    MOMENTUM_RSI_MIN,
    RALLY_MACD_CROSSOVER_WINDOW,
    RALLY_MIN_52W_GAP,
    RALLY_RSI_HIGH,
    RALLY_RSI_LOW,
    SMART_MONEY_MIN_52W_GAP,
    VALUE_MIN_52W_GAP,
    VALUE_RSI_MAX,
)
from tilt.signals import IndicatorSnapshot


@dataclass(frozen=True)
class UniverseStats:
    """Universe-wide indicator distributions used to explain empty lanes."""

    total: int
    pct_macd_crossover_3d: float
    pct_macd_positive: float
    pct_above_ema20: float
    pct_rsi_in_45_62: float
    pct_rsi_above_62: float
    pct_rsi_above_50: float
    pct_rsi_below_35: float
    pct_15pct_below_52w: float
    pct_10pct_below_52w: float


def compute_universe_stats(
    snapshots: list[tuple[IndicatorSnapshot, float]],
) -> UniverseStats:
    """Aggregate condition-pass rates across the scanned universe.

    Each item is ``(snapshot, cmp)``. Returns a percentage (0-100) for each
    condition Tilt's lane filters care about.
    """
    n = len(snapshots)
    if n == 0:
        return UniverseStats(
            total=0,
            pct_macd_crossover_3d=0,
            pct_macd_positive=0,
            pct_above_ema20=0,
            pct_rsi_in_45_62=0,
            pct_rsi_above_62=0,
            pct_rsi_above_50=0,
            pct_rsi_below_35=0,
            pct_15pct_below_52w=0,
            pct_10pct_below_52w=0,
        )

    def pct(predicate) -> float:
        return round(100.0 * sum(1 for s, c in snapshots if predicate(s, c)) / n, 1)

    return UniverseStats(
        total=n,
        pct_macd_crossover_3d=pct(
            lambda s, c: (
                s.macd_crossover_days_ago is not None
                and s.macd_crossover_days_ago <= RALLY_MACD_CROSSOVER_WINDOW
            )
        ),
        pct_macd_positive=pct(lambda s, c: s.macd_hist > 0),
        pct_above_ema20=pct(lambda s, c: c > s.ema20),
        pct_rsi_in_45_62=pct(lambda s, c: RALLY_RSI_LOW <= s.rsi <= RALLY_RSI_HIGH),
        pct_rsi_above_62=pct(lambda s, c: s.rsi > RALLY_RSI_HIGH),
        pct_rsi_above_50=pct(lambda s, c: s.rsi >= MOMENTUM_RSI_MIN),
        pct_rsi_below_35=pct(lambda s, c: s.rsi < VALUE_RSI_MAX),
        pct_15pct_below_52w=pct(lambda s, c: s.pct_below_52w_high >= RALLY_MIN_52W_GAP),
        pct_10pct_below_52w=pct(lambda s, c: s.pct_below_52w_high >= VALUE_MIN_52W_GAP),
    )


def explain_empty_lane(lane_id: str, stats: UniverseStats, mf_tracked: int = 0) -> str:
    """Return a plain-English explanation for why a lane has zero picks.

    Picks the most-violated condition for the lane's filter and surfaces it
    with the actual percentage. If two conditions are both broadly violated,
    cites both — keeps the explanation honest about the multiple causes.
    """
    if stats.total == 0:
        return "No data — try Refresh."

    if lane_id == "strong":
        return _explain_strong(stats)
    if lane_id == "momentum":
        return _explain_momentum(stats)
    if lane_id == "value":
        return _explain_value(stats)
    if lane_id == "smart_money":
        return _explain_smart_money(stats, mf_tracked)
    return "No setups today."


def _explain_strong(s: UniverseStats) -> str:
    bottlenecks: list[str] = []
    if s.pct_macd_crossover_3d < 10:
        bottlenecks.append(
            f"only {s.pct_macd_crossover_3d}% of stocks had a MACD crossover in the last 3 days"
        )
    if s.pct_rsi_above_62 > 50:
        bottlenecks.append(
            f"{s.pct_rsi_above_62}% of stocks have RSI > 62 (overbought — the entry band is 45-62)"
        )
    if s.pct_15pct_below_52w < 15:
        bottlenecks.append(
            f"only {s.pct_15pct_below_52w}% of stocks are 15%+ below their 52-week high (Strong needs the value gap)"
        )
    if not bottlenecks:
        return (
            "Most stocks fail at least one of the four Strong conditions, "
            "but none dominates today — the filter is correctly conservative."
        )
    return "Strong needs all 4 conditions to fire. " + _join_reasons(bottlenecks)


def _explain_momentum(s: UniverseStats) -> str:
    bottlenecks: list[str] = []
    if s.pct_macd_positive < 30:
        bottlenecks.append(
            f"only {s.pct_macd_positive}% of stocks have positive MACD histogram (market in a corrective phase)"
        )
    if s.pct_above_ema20 < 40:
        bottlenecks.append(
            f"only {s.pct_above_ema20}% of stocks are above their 20-day moving average (broad weakness)"
        )
    if s.pct_rsi_above_50 < 30:
        bottlenecks.append(
            f"only {s.pct_rsi_above_50}% of stocks have RSI ≥ 50 (momentum hasn't reasserted)"
        )
    if not bottlenecks:
        return (
            "Momentum requires positive MACD + above EMA20 + RSI ≥ 50. "
            "Failing stocks split across multiple conditions, no single cause."
        )
    return "Momentum needs all 3 conditions. " + _join_reasons(bottlenecks)


def _explain_value(s: UniverseStats) -> str:
    if s.pct_rsi_below_35 < 5:
        return (
            f"Only {s.pct_rsi_below_35}% of stocks have RSI < 35 today — the market hasn't capitulated, "
            "so almost nothing is oversold enough to qualify as Value."
        )
    if s.pct_10pct_below_52w < 20:
        return (
            f"Some stocks are oversold (RSI < 35: {s.pct_rsi_below_35}%) but only "
            f"{s.pct_10pct_below_52w}% are also 10%+ below their 52-week high. "
            "Value needs both — oversold AND a clear discount."
        )
    return "Stocks meeting both Value conditions (RSI<35 + 10%+ below 52w high) just haven't surfaced today."


def _explain_smart_money(s: UniverseStats, mf_tracked: int) -> str:
    if mf_tracked == 0:
        return "No mutual-fund holdings tracked yet — add funds to data/mutual_fund_holdings.csv."
    return (
        f"Tracked MFs hold {mf_tracked} stock(s), but today they're either passing "
        "the stricter Strong/Momentum/Value lanes (so they appear there instead), "
        f"or they're all failing the loose check (positive MACD / RSI<35 / "
        f"≥{int(SMART_MONEY_MIN_52W_GAP * 100)}% below 52w high)."
    )


def _join_reasons(reasons: list[str]) -> str:
    """Cap at top 2 reasons so the empty-state text stays scannable."""
    if len(reasons) == 1:
        return reasons[0].capitalize() + "."
    return f"{reasons[0].capitalize()}; also, {reasons[1]}."
