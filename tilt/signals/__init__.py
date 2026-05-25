"""Signal engine — Rally / Averaging / Trap filters + composite score.

Owns the "is this a buy / hold / sell signal" logic per SPEC Wave 3. Every
public function here returns the locked SignalResult shape so the API layer
(step 8) can serialize directly without bespoke marshalling per endpoint.
"""

from __future__ import annotations

from tilt.signals.engine import (
    ScanInput,
    build_snapshot,
    run_averaging_scan,
    run_rally_scan,
    run_trap_scan,
)
from tilt.signals.filters import (
    AVERAGING_RSI_HIGH,
    RALLY_MACD_CROSSOVER_WINDOW,
    RALLY_MIN_52W_GAP,
    RALLY_RSI_HIGH,
    RALLY_RSI_LOW,
    TRAP_52W_PROXIMITY,
    TRAP_RSI_HIGH,
    FilterResult,
    evaluate_averaging,
    evaluate_rally,
    evaluate_trap,
)
from tilt.signals.models import IndicatorSnapshot, ScoreBreakdown, SignalResult
from tilt.signals.score import build_score, momentum_score, rsi_score, upside_score

__all__ = [
    "AVERAGING_RSI_HIGH",
    "RALLY_MACD_CROSSOVER_WINDOW",
    "RALLY_MIN_52W_GAP",
    "RALLY_RSI_HIGH",
    "RALLY_RSI_LOW",
    "TRAP_52W_PROXIMITY",
    "TRAP_RSI_HIGH",
    "FilterResult",
    "IndicatorSnapshot",
    "ScanInput",
    "ScoreBreakdown",
    "SignalResult",
    "build_score",
    "build_snapshot",
    "evaluate_averaging",
    "evaluate_rally",
    "evaluate_trap",
    "momentum_score",
    "rsi_score",
    "run_averaging_scan",
    "run_rally_scan",
    "run_trap_scan",
    "upside_score",
]
