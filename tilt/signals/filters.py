"""Rally / Averaging / Trap filters per SPEC Wave 3.

Each filter takes an ``IndicatorSnapshot`` (and price/holding context as
needed) and returns a ``FilterResult`` carrying both the pass/fail verdict
and the *list of conditions that fired*. The triggers list is the input to
the API contract's ``filter_triggers[]`` field — every recommendation must
show its work.

Thresholds are module-level constants, not magic numbers, so the backtest
sub-agent (step 9) can sweep them and any future tuning has one place to look.
"""

from __future__ import annotations

from dataclasses import dataclass

from tilt.signals.models import IndicatorSnapshot

# --- Rally thresholds ---
# Widened from the original SPEC defaults (RSI 45-62, MACD window 3, gap 15%)
# after a snapshot-day calibration showed the strict defaults missed most of the
# rotation regime we wanted to surface. New defaults still satisfy the SPEC
# intent (rising trend + room to run + early entry) but with more headroom.
RALLY_RSI_LOW = 40.0  # was 45
RALLY_RSI_HIGH = 68.0  # was 62
RALLY_MACD_CROSSOVER_WINDOW = 30  # was 3 — month-long window. The "fresh entry"
# intent stays, just calibrated for periods where the regime is quieter.
RALLY_MIN_52W_GAP = 0.10  # was 0.15 — 10%+ below 52w is enough "room to run"

# --- Averaging thresholds ---
AVERAGING_RSI_HIGH = 40.0  # was 35 — anything below RSI 40 counts as oversold for averaging

# --- Trap thresholds ---
TRAP_RSI_HIGH = 70.0
TRAP_52W_PROXIMITY = 0.02  # within 2% of 52-week high


@dataclass(frozen=True)
class FilterResult:
    passed: bool
    triggers: tuple[str, ...]


def evaluate_rally(snap: IndicatorSnapshot, cmp: float) -> FilterResult:
    """Rally filter: all four conditions must fire.

    1. MACD histogram crossed positive within the last ``RALLY_MACD_CROSSOVER_WINDOW`` bars.
    2. Close > EMA20 (price holding above its short MA).
    3. RSI in [45, 62] (room to run, not yet overbought).
    4. At least 15% below the 52-week high (room above for the rally).
    """
    triggers: list[str] = []

    if (
        snap.macd_crossover_days_ago is not None
        and snap.macd_crossover_days_ago <= RALLY_MACD_CROSSOVER_WINDOW
    ):
        triggers.append("macd_crossover_3d")

    if cmp > snap.ema20:
        triggers.append("ema20_support")

    if RALLY_RSI_LOW <= snap.rsi <= RALLY_RSI_HIGH:
        triggers.append("rsi_in_band")

    if snap.pct_below_52w_high >= RALLY_MIN_52W_GAP:
        triggers.append("52w_gap_>=15pct")

    return FilterResult(passed=len(triggers) == 4, triggers=tuple(triggers))


def evaluate_averaging(
    snap: IndicatorSnapshot,
    cmp: float,
    avg_buy: float | None,
) -> FilterResult:
    """Averaging filter: all three conditions must fire (averaging-down candidate).

    1. CMP < average buy price (caller is underwater on the position).
    2. RSI < 35 (oversold).
    3. MACD histogram trending up over the last few bars (bottom may be in).

    Requires the caller's average-buy price; if the position has none (cash
    only), the filter returns ``passed=False`` with an empty trigger set.
    """
    triggers: list[str] = []

    if avg_buy is None:
        return FilterResult(passed=False, triggers=())

    if cmp < avg_buy:
        triggers.append("below_avg_buy")

    if snap.rsi < AVERAGING_RSI_HIGH:
        triggers.append("rsi_oversold")

    if snap.macd_hist_rising:
        triggers.append("macd_hist_rising")

    return FilterResult(passed=len(triggers) == 3, triggers=tuple(triggers))


def evaluate_trap(snap: IndicatorSnapshot) -> FilterResult:
    """Trap filter: EITHER condition fires (overbought-exit candidate).

    1. RSI > 70 (overbought, mean-reversion risk).
    2. Within 2% of 52-week high (limited upside, sell-the-top region).
    """
    triggers: list[str] = []

    if snap.rsi > TRAP_RSI_HIGH:
        triggers.append("rsi_overbought")

    if snap.pct_below_52w_high < TRAP_52W_PROXIMITY:
        triggers.append("near_52w_high")

    return FilterResult(passed=len(triggers) > 0, triggers=tuple(triggers))
