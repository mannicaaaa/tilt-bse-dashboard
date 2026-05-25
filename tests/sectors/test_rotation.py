"""Sector rotation — momentum computation + Hot/Neutral/Cold tagging."""

from __future__ import annotations

import numpy as np
import pandas as pd

from tilt.sectors import (
    COLD_TAG,
    HOT_TAG,
    NEUTRAL_TAG,
    compute_sector_momentum,
    rank_sectors,
)
from tilt.universe import SECTOR_NAMES


def _series_with_recent_momentum(seed: int = 0) -> pd.Series:
    """Series engineered with a recent acceleration → positive MACD histogram."""
    n = 260
    rng = np.random.default_rng(seed)
    base = np.linspace(80, 180, n) + rng.standard_normal(n) * 1.0
    base[-20:] = base[-21] * np.linspace(1.0, 0.85, 20)  # pullback
    base[-5:] = base[-6] * np.linspace(1.0, 1.05, 5)  # sharp bounce
    return pd.Series(base)


def _steady_series(seed: int = 0) -> pd.Series:
    """Series with no recent acceleration → MACD histogram ≈ 0 → near-zero momentum."""
    n = 260
    rng = np.random.default_rng(seed)
    base = np.linspace(100, 90, n) + rng.standard_normal(n) * 0.3
    return pd.Series(base)


class TestComputeSectorMomentum:
    def test_recent_acceleration_yields_positive_momentum(self) -> None:
        constituents = {f"T{i}": _series_with_recent_momentum(seed=i) for i in range(5)}
        out = compute_sector_momentum(constituents)
        assert out > 0.0

    def test_steady_series_yield_near_zero_momentum(self) -> None:
        # Steady trends have parallel-tracking EMAs → MACD hist near 0 → momentum ≈ 0.
        constituents = {f"T{i}": _steady_series(seed=i) for i in range(5)}
        out = compute_sector_momentum(constituents)
        assert out < 0.2

    def test_empty_constituents_returns_zero(self) -> None:
        assert compute_sector_momentum({}) == 0.0

    def test_skips_too_short_series(self) -> None:
        # The short series must be silently skipped, not crash the snapshot
        # builder. We assert the function returns a finite, non-negative number
        # — the specific value depends on the GOOD series' RNG seed, which
        # isn't the point of this test.
        constituents = {
            "SHORT": pd.Series([100.0, 101.0, 102.0]),
            "GOOD": _series_with_recent_momentum(seed=42),
        }
        out = compute_sector_momentum(constituents)
        assert out >= 0.0
        assert out <= 1.0  # should be a normalized [0,1] value


class TestRankSectors:
    def test_empty_returns_empty(self) -> None:
        assert rank_sectors({}) == []

    def test_fourteen_sectors_split_4_6_4(self) -> None:
        # Construct distinct momentum values for all 14 sectors.
        momentums = {name: (i + 1) / 14.0 for i, name in enumerate(SECTOR_NAMES)}
        rankings = rank_sectors(momentums)
        assert len(rankings) == 14
        hot = [r for r in rankings if r.tag == HOT_TAG]
        neutral = [r for r in rankings if r.tag == NEUTRAL_TAG]
        cold = [r for r in rankings if r.tag == COLD_TAG]
        assert len(hot) == 4
        assert len(neutral) == 6
        assert len(cold) == 4

    def test_sorted_by_momentum_descending(self) -> None:
        momentums = {name: (i + 1) / 14.0 for i, name in enumerate(SECTOR_NAMES)}
        rankings = rank_sectors(momentums)
        for i in range(len(rankings) - 1):
            assert rankings[i].momentum >= rankings[i + 1].momentum
            assert rankings[i].rank == i + 1

    def test_top_is_hottest_sector(self) -> None:
        # Bank is intentionally given the highest momentum.
        momentums = dict.fromkeys(SECTOR_NAMES, 0.1)
        momentums["nifty_bank"] = 0.9
        rankings = rank_sectors(momentums)
        assert rankings[0].sector_name == "nifty_bank"
        assert rankings[0].tag == HOT_TAG
        assert rankings[0].rank == 1

    def test_display_names_populated(self) -> None:
        momentums = dict.fromkeys(SECTOR_NAMES, 0.5)
        rankings = rank_sectors(momentums)
        for r in rankings:
            assert r.display_name
            assert r.display_name != r.sector_name  # display name is the pretty version

    def test_handles_arbitrary_count(self) -> None:
        # 6 sectors → roughly thirds: 2 hot, 2 neutral, 2 cold.
        momentums = {f"s{i}": i / 6.0 for i in range(6)}
        rankings = rank_sectors(momentums)
        tags = [r.tag for r in rankings]
        assert tags.count(HOT_TAG) >= 1
        assert tags.count(COLD_TAG) >= 1
