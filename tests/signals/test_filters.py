"""Filter evaluation — Rally, Averaging, Trap."""

from __future__ import annotations

from tilt.signals.filters import (
    evaluate_averaging,
    evaluate_rally,
    evaluate_trap,
)


class TestRally:
    def test_passes_when_all_four_conditions_fire(self, make_snapshot) -> None:
        snap = make_snapshot(
            rsi=55,
            macd_hist=0.5,
            ema20=100,
            pct_below_52w_high=0.20,
            macd_crossover_days_ago=2,
        )
        out = evaluate_rally(snap, cmp=105.0)
        assert out.passed
        assert set(out.triggers) == {
            "macd_crossover_3d",
            "ema20_support",
            "rsi_in_band",
            "52w_gap_>=15pct",
        }

    def test_fails_if_macd_crossover_outside_window(self, make_snapshot) -> None:
        # Window is 30 bars now; 45 days ago is firmly outside.
        snap = make_snapshot(rsi=55, ema20=100, pct_below_52w_high=0.20, macd_crossover_days_ago=45)
        out = evaluate_rally(snap, cmp=105.0)
        assert not out.passed
        assert "macd_crossover_3d" not in out.triggers

    def test_fails_if_no_crossover_detected(self, make_snapshot) -> None:
        snap = make_snapshot(
            rsi=55, ema20=100, pct_below_52w_high=0.20, macd_crossover_days_ago=None
        )
        out = evaluate_rally(snap, cmp=105.0)
        assert not out.passed

    def test_fails_if_rsi_too_high(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=75, ema20=100, pct_below_52w_high=0.20, macd_crossover_days_ago=1)
        out = evaluate_rally(snap, cmp=105.0)
        assert not out.passed
        assert "rsi_in_band" not in out.triggers

    def test_fails_if_rsi_too_low(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=30, ema20=100, pct_below_52w_high=0.20, macd_crossover_days_ago=1)
        out = evaluate_rally(snap, cmp=105.0)
        assert not out.passed

    def test_fails_if_close_below_ema20(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=55, ema20=110, pct_below_52w_high=0.20, macd_crossover_days_ago=1)
        out = evaluate_rally(snap, cmp=105.0)
        assert not out.passed
        assert "ema20_support" not in out.triggers

    def test_fails_if_too_close_to_52w_high(self, make_snapshot) -> None:
        # Below the 10% gap threshold — should not pass.
        snap = make_snapshot(rsi=55, ema20=100, pct_below_52w_high=0.05, macd_crossover_days_ago=1)
        out = evaluate_rally(snap, cmp=105.0)
        assert not out.passed

    def test_partial_triggers_reported_even_on_fail(self, make_snapshot) -> None:
        # RSI passes, EMA passes, others fail.
        snap = make_snapshot(
            rsi=55, ema20=100, pct_below_52w_high=0.05, macd_crossover_days_ago=None
        )
        out = evaluate_rally(snap, cmp=105.0)
        assert not out.passed
        # Triggers list shows what DID fire — useful in the explainability surface.
        assert "rsi_in_band" in out.triggers
        assert "ema20_support" in out.triggers


class TestAveraging:
    def test_passes_when_all_three_conditions_fire(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=30, macd_hist=0.5, macd_hist_rising=True)
        out = evaluate_averaging(snap, cmp=90.0, avg_buy=100.0)
        assert out.passed
        assert set(out.triggers) == {"below_avg_buy", "rsi_oversold", "macd_hist_rising"}

    def test_fails_if_not_underwater(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=30, macd_hist_rising=True)
        out = evaluate_averaging(snap, cmp=110.0, avg_buy=100.0)
        assert not out.passed
        assert "below_avg_buy" not in out.triggers

    def test_fails_if_rsi_not_oversold(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=50, macd_hist_rising=True)
        out = evaluate_averaging(snap, cmp=90.0, avg_buy=100.0)
        assert not out.passed

    def test_fails_if_macd_not_rising(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=30, macd_hist_rising=False)
        out = evaluate_averaging(snap, cmp=90.0, avg_buy=100.0)
        assert not out.passed

    def test_returns_empty_when_no_avg_buy(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=30, macd_hist_rising=True)
        out = evaluate_averaging(snap, cmp=90.0, avg_buy=None)
        assert not out.passed
        assert out.triggers == ()


class TestTrap:
    def test_passes_on_rsi_overbought(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=75, pct_below_52w_high=0.20)
        out = evaluate_trap(snap)
        assert out.passed
        assert "rsi_overbought" in out.triggers

    def test_passes_on_near_52w_high(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=60, pct_below_52w_high=0.01)
        out = evaluate_trap(snap)
        assert out.passed
        assert "near_52w_high" in out.triggers

    def test_passes_on_both(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=75, pct_below_52w_high=0.01)
        out = evaluate_trap(snap)
        assert out.passed
        assert set(out.triggers) == {"rsi_overbought", "near_52w_high"}

    def test_fails_when_neither_condition_fires(self, make_snapshot) -> None:
        snap = make_snapshot(rsi=55, pct_below_52w_high=0.20)
        out = evaluate_trap(snap)
        assert not out.passed
        assert out.triggers == ()
