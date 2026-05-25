"""Composite score — component normalizations + weighting."""

from __future__ import annotations

import pytest

from tilt.signals.score import (
    WEIGHT_MOMENTUM,
    WEIGHT_RSI,
    WEIGHT_SECTOR,
    WEIGHT_UPSIDE,
    build_score,
    momentum_score,
    rsi_score,
    upside_score,
)


class TestMomentumScore:
    def test_zero_when_hist_non_positive(self, make_snapshot) -> None:
        assert momentum_score(make_snapshot(macd_hist=0.0), cmp=100.0) == 0.0
        assert momentum_score(make_snapshot(macd_hist=-1.0), cmp=100.0) == 0.0

    def test_clipped_at_one(self, make_snapshot) -> None:
        # 5% of price worth of histogram → far beyond saturation, clips to 1.
        assert momentum_score(make_snapshot(macd_hist=5.0), cmp=100.0) == 1.0

    def test_linear_in_between(self, make_snapshot) -> None:
        # Histogram of 0.5 = 0.5% of price → score 0.5
        assert momentum_score(make_snapshot(macd_hist=0.5), cmp=100.0) == 0.5


class TestUpsideScore:
    def test_zero_at_high(self, make_snapshot) -> None:
        assert upside_score(make_snapshot(pct_below_52w_high=0.0)) == 0.0

    def test_saturates_at_thirty_pct(self, make_snapshot) -> None:
        assert upside_score(make_snapshot(pct_below_52w_high=0.30)) == 1.0
        assert upside_score(make_snapshot(pct_below_52w_high=0.50)) == 1.0

    def test_halfway(self, make_snapshot) -> None:
        assert upside_score(make_snapshot(pct_below_52w_high=0.15)) == 0.5


class TestRsiScore:
    def test_peak_at_center(self, make_snapshot) -> None:
        assert rsi_score(make_snapshot(rsi=53.5)) == pytest.approx(1.0)

    def test_zero_outside_band(self, make_snapshot) -> None:
        assert rsi_score(make_snapshot(rsi=30)) == 0.0
        assert rsi_score(make_snapshot(rsi=75)) == 0.0

    def test_falls_off_symmetrically(self, make_snapshot) -> None:
        below = rsi_score(make_snapshot(rsi=49))
        above = rsi_score(make_snapshot(rsi=58))
        assert below == pytest.approx(above, abs=1e-9)


class TestBuildScore:
    def test_weights_sum_to_one(self) -> None:
        total = WEIGHT_MOMENTUM + WEIGHT_UPSIDE + WEIGHT_RSI + WEIGHT_SECTOR
        assert total == pytest.approx(1.0)

    def test_perfect_signal(self, make_snapshot) -> None:
        snap = make_snapshot(macd_hist=2.0, pct_below_52w_high=0.30, rsi=53.5)
        breakdown = build_score(snap, cmp=100.0, sector_strength=1.0)
        assert breakdown.momentum == pytest.approx(WEIGHT_MOMENTUM)
        assert breakdown.upside == pytest.approx(WEIGHT_UPSIDE)
        assert breakdown.rsi == pytest.approx(WEIGHT_RSI)
        assert breakdown.sector == pytest.approx(WEIGHT_SECTOR)
        assert breakdown.total == pytest.approx(1.0)

    def test_neutral_sector_placeholder(self, make_snapshot) -> None:
        # Calling before sector overlay is wired — pass 0.5 as the placeholder.
        snap = make_snapshot(macd_hist=1.0, pct_below_52w_high=0.30, rsi=53.5)
        breakdown = build_score(snap, cmp=100.0, sector_strength=0.5)
        assert breakdown.sector == pytest.approx(WEIGHT_SECTOR * 0.5)

    def test_sector_strength_clipped(self, make_snapshot) -> None:
        snap = make_snapshot()
        assert build_score(snap, 100.0, sector_strength=1.5).sector == pytest.approx(WEIGHT_SECTOR)
        assert build_score(snap, 100.0, sector_strength=-0.5).sector == 0.0

    def test_breakdown_components_sum_to_total(self, make_snapshot) -> None:
        snap = make_snapshot(macd_hist=0.3, pct_below_52w_high=0.18, rsi=55)
        breakdown = build_score(snap, cmp=100.0, sector_strength=0.7)
        assert breakdown.total == pytest.approx(
            breakdown.momentum + breakdown.upside + breakdown.rsi + breakdown.sector
        )
