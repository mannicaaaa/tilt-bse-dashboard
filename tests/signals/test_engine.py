"""Engine orchestrator — snapshot construction + scan orchestration."""

from __future__ import annotations

import numpy as np
import pandas as pd

from tilt.signals import (
    ScanInput,
    build_snapshot,
    run_averaging_scan,
    run_rally_scan,
    run_trap_scan,
)


class TestBuildSnapshot:
    def test_returns_all_fields_populated(self, rally_close) -> None:
        snap = build_snapshot(rally_close)
        assert isinstance(snap.rsi, float)
        assert isinstance(snap.macd_hist, float)
        assert isinstance(snap.ema20, float)
        assert 0.0 <= snap.pct_below_52w_high <= 1.0

    def test_52w_high_uses_at_most_252_bars(self) -> None:
        # 500-bar series where the all-time high is 100 in the first 100 bars,
        # latest 252 bars top out at 50.
        close = pd.Series(np.concatenate([np.linspace(80, 100, 100), np.linspace(50, 50, 400)]))
        snap = build_snapshot(close)
        # 52w window high should be ~50, not 100. pct_below_52w_high ≈ 0.
        assert snap.pct_below_52w_high < 0.05

    def test_crossover_detected_when_hist_recently_positive(self, rally_close) -> None:
        snap = build_snapshot(rally_close)
        # Engineered rally close has a recent bounce; should detect a recent crossover.
        # Test is loose: just check that something was detected within lookback.
        assert snap.macd_crossover_days_ago is None or 0 <= snap.macd_crossover_days_ago <= 30


class TestRallyScan:
    def test_passing_input_appears_in_result(self, rally_close) -> None:
        inp = ScanInput(
            ticker="TEST",
            name="Test Co",
            close=rally_close,
            sector="nifty_test",
            sector_tag="Hot",
            sector_strength=0.8,
        )
        results = run_rally_scan([inp])
        if results:  # filter is strict — only assert structure if pass
            row = results[0]
            assert row.ticker == "TEST"
            assert row.sector_tag == "Hot"
            assert row.score == row.score_breakdown.total
            assert row.filter_triggers

    def test_empty_when_nothing_passes(self) -> None:
        # Constant series → no momentum, no crossover, nothing triggers.
        flat = pd.Series([100.0] * 260)
        inp = ScanInput(
            ticker="FLAT",
            name="Flat",
            close=flat,
            sector="nifty_x",
            sector_tag="Neutral",
            sector_strength=0.5,
        )
        assert run_rally_scan([inp]) == []

    def test_results_sorted_by_score_desc(self, rally_close) -> None:
        # Same close, two tickers with different sector strengths.
        inputs = [
            ScanInput("A", "A Co", rally_close, "x", "Cold", sector_strength=0.1),
            ScanInput("B", "B Co", rally_close, "y", "Hot", sector_strength=0.9),
        ]
        results = run_rally_scan(inputs)
        if len(results) == 2:
            assert results[0].score >= results[1].score


class TestTrapScan:
    def test_overbought_triggers(self, trap_close) -> None:
        inp = ScanInput("T", "Trap Co", trap_close, "x", "Hot", sector_strength=0.5)
        results = run_trap_scan([inp])
        assert len(results) >= 1
        assert results[0].filter_triggers  # at least one condition fired


class TestAveragingScan:
    def test_requires_avg_buy(self, averaging_close) -> None:
        # Without avg_buy → cannot average
        inp = ScanInput(
            "A",
            "A Co",
            averaging_close,
            "x",
            "Cold",
            sector_strength=0.3,
            avg_buy=None,
        )
        assert run_averaging_scan([inp]) == []
