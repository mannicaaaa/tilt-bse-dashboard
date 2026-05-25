"""Shared fixtures for the signal-engine tests.

Provides ``IndicatorSnapshot`` builders and engineered close-price series
that satisfy each filter's exact conditions.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from tilt.signals.models import IndicatorSnapshot


def snapshot(
    *,
    rsi: float = 50.0,
    macd: float = 0.0,
    macd_signal: float = 0.0,
    macd_hist: float = 0.0,
    ema20: float = 100.0,
    pct_below_52w_high: float = 0.15,
    macd_crossover_days_ago: int | None = None,
    macd_hist_rising: bool = False,
) -> IndicatorSnapshot:
    """Build a snapshot with defaults that pass nothing — override per test."""
    return IndicatorSnapshot(
        rsi=rsi,
        macd=macd,
        macd_signal=macd_signal,
        macd_hist=macd_hist,
        ema20=ema20,
        pct_below_52w_high=pct_below_52w_high,
        macd_crossover_days_ago=macd_crossover_days_ago,
        macd_hist_rising=macd_hist_rising,
    )


@pytest.fixture
def make_snapshot():
    return snapshot


@pytest.fixture
def rally_close() -> pd.Series:
    """Engineered close series that should pass the Rally filter.

    Long uptrend → recent pullback to land RSI in band and put price 15%
    below the 52w high, but with MACD just crossed up on the bounce.
    """
    n = 260
    rng = np.random.default_rng(0)
    # Steady uptrend with mild noise
    base = np.linspace(80, 200, n) + rng.standard_normal(n) * 1.5
    # Pull back the last 20 bars by 15-20%
    base[-20:] = base[-21] * np.linspace(1.0, 0.80, 20)
    # Then bounce the last 4 bars to trigger MACD cross + RSI in band
    base[-4:] = base[-5] * np.linspace(1.0, 1.04, 4)
    return pd.Series(base)


@pytest.fixture
def trap_close() -> pd.Series:
    """Engineered close series near 52w high with strong recent rip (RSI > 70)."""
    n = 260
    rng = np.random.default_rng(1)
    base = np.linspace(100, 150, n) + rng.standard_normal(n) * 0.5
    # Aggressive last-20-bar rip
    base[-20:] = base[-21] * np.linspace(1.0, 1.25, 20)
    return pd.Series(base)


@pytest.fixture
def averaging_close() -> pd.Series:
    """Engineered downtrend that just bottomed; RSI oversold + MACD hist turning up."""
    n = 260
    rng = np.random.default_rng(2)
    # Downtrend
    base = np.linspace(200, 80, n) + rng.standard_normal(n) * 1.0
    # Last 5 bars stop falling and tick up
    base[-5:] = base[-6] * np.linspace(1.0, 1.02, 5)
    return pd.Series(base)
