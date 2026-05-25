"""Backtest dataclasses."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class BacktestMetrics:
    triggers: int
    hit_rate_30d: float
    avg_fwd_return_30d: float
    max_drawdown_per_signal: float
    avg_drawdown_per_signal: float
