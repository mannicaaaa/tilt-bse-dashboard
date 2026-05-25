"""Backtest engine — lightweight Rally-filter performance on historical OHLCV.

Reports: trigger count, 30-day forward hit rate, average 30-day forward return,
worst single-signal drawdown. Designed to be invoked in parallel via the
``backtest-runner`` sub-agent (one variant per agent) so parameter sweeps
don't serialize.
"""

from __future__ import annotations

from tilt.backtest.engine import (
    DEFAULT_HOLD_PERIOD,
    BacktestResult,
    RallySignalEvent,
    backtest_ticker,
    compute_metrics,
    run_rally_backtest,
)
from tilt.backtest.models import BacktestMetrics

__all__ = [
    "DEFAULT_HOLD_PERIOD",
    "BacktestMetrics",
    "BacktestResult",
    "RallySignalEvent",
    "backtest_ticker",
    "compute_metrics",
    "run_rally_backtest",
]
