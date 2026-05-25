"""Backtest engine — walk-forward signal detection + metrics aggregation."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from tilt.backtest import (
    BacktestMetrics,
    RallySignalEvent,
    backtest_ticker,
    compute_metrics,
)


def _noisy_series(seed: int = 0, n: int = 600) -> pd.Series:
    """Long noisy series — some bars somewhere will eventually trigger the filter."""
    rng = np.random.default_rng(seed)
    returns = rng.standard_normal(n) * 0.02
    base = 100.0 * np.exp(np.cumsum(returns))
    idx = pd.bdate_range(end=pd.Timestamp("2026-05-01"), periods=n)
    return pd.Series(base, index=idx)


class TestBacktestTicker:
    def test_empty_when_series_too_short(self) -> None:
        close = pd.Series(np.linspace(100, 120, 30))
        assert backtest_ticker("X", close) == []

    def test_no_signals_on_constant_series(self) -> None:
        idx = pd.bdate_range(end=pd.Timestamp("2026-05-01"), periods=400)
        close = pd.Series([100.0] * 400, index=idx)
        assert backtest_ticker("X", close) == []

    def test_returns_list_of_signal_events(self) -> None:
        # We don't assert *how many* — that depends on the RNG. We assert the
        # return type and that any signals returned have the expected shape.
        signals = backtest_ticker("TEST", _noisy_series(seed=0))
        assert isinstance(signals, list)
        for s in signals:
            assert isinstance(s, RallySignalEvent)
            assert s.ticker == "TEST"
            assert s.entry_price > 0
            assert s.exit_price > 0
            assert s.max_drawdown <= 0.0001  # entry IS the entry-day price

    def test_forward_returns_match_entry_and_exit(self) -> None:
        for seed in range(10):
            signals = backtest_ticker("T", _noisy_series(seed=seed))
            for s in signals:
                expected = (s.exit_price - s.entry_price) / s.entry_price
                assert s.fwd_return == pytest.approx(expected, abs=1e-12)


class TestComputeMetrics:
    def test_empty_metrics(self) -> None:
        m = compute_metrics([])
        assert m.triggers == 0
        assert m.hit_rate_30d == 0.0

    def test_aggregates_correctly(self) -> None:
        signals = [
            RallySignalEvent("A", 0, "2025-01-01", 100, 110, 0.10, -0.02),
            RallySignalEvent("B", 0, "2025-01-02", 100, 105, 0.05, -0.01),
            RallySignalEvent("C", 0, "2025-01-03", 100, 95, -0.05, -0.08),
        ]
        m = compute_metrics(signals)
        assert isinstance(m, BacktestMetrics)
        assert m.triggers == 3
        assert m.hit_rate_30d == pytest.approx(2 / 3)
        assert m.avg_fwd_return_30d == pytest.approx((0.10 + 0.05 - 0.05) / 3)
        assert m.max_drawdown_per_signal == -0.08
        assert m.avg_drawdown_per_signal == pytest.approx((-0.02 - 0.01 - 0.08) / 3)
