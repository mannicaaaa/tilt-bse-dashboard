"""Behavioral / edge-case tests for the indicator suite.

Complement to ``test_parity.py``. Parity proves "our implementation matches the
reference"; behavior proves "the math is correct in regimes you can reason
about analytically" — constant series, pure trends, warmup boundaries. These
tests would still pass if pandas-ta were removed tomorrow.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from tilt.indicators import macd, rsi

# --- RSI behavior -----------------------------------------------------------


class TestRSIBehavior:
    def test_only_index_zero_is_nan(self) -> None:
        # Wilder RMA via bare ewm: only index 0 is NaN (from diff()); subsequent
        # values are mathematically defined immediately, though noisy until the
        # smoothing window settles (~length periods).
        close = pd.Series(np.linspace(100, 120, 50))
        out = rsi(close, length=14)
        assert pd.isna(out.iloc[0])
        assert out.iloc[1:].notna().all()

    def test_pure_uptrend_is_100(self) -> None:
        close = pd.Series(np.arange(1.0, 51.0))
        out = rsi(close, length=14)
        assert (out.iloc[1:] == 100.0).all()

    def test_pure_downtrend_is_0(self) -> None:
        close = pd.Series(np.arange(50.0, 0.0, -1.0))
        out = rsi(close, length=14)
        assert (out.iloc[1:] == 0.0).all()

    def test_constant_series_is_nan(self) -> None:
        # No movement → both gain and loss series are zero → RS = 0/0 → NaN.
        close = pd.Series([100.0] * 50)
        out = rsi(close, length=14)
        assert out.iloc[1:].isna().all()

    def test_invalid_length_raises(self) -> None:
        close = pd.Series(np.linspace(100, 120, 50))
        with pytest.raises(ValueError, match="length must be >= 1"):
            rsi(close, length=0)


# --- MACD behavior ----------------------------------------------------------


class TestMACDBehavior:
    def test_columns_present(self) -> None:
        close = pd.Series(np.linspace(100, 120, 100))
        out = macd(close)
        assert list(out.columns) == ["macd", "signal", "histogram"]

    def test_constant_series_is_zero(self) -> None:
        close = pd.Series([100.0] * 100)
        out = macd(close)
        # macd_line non-NaN from slow-1=25; signal non-NaN from slow+signal-2=33.
        assert (out["macd"].iloc[33:] == 0.0).all()
        assert (out["signal"].iloc[33:] == 0.0).all()
        assert (out["histogram"].iloc[33:] == 0.0).all()

    def test_warmup_boundaries(self) -> None:
        close = pd.Series(np.linspace(100, 200, 100))
        out = macd(close, fast=12, slow=26, signal=9)
        # macd_line valid from index slow-1 = 25
        assert out["macd"].iloc[:25].isna().all()
        assert out["macd"].iloc[25:].notna().all()
        # signal/histogram valid from index slow + signal - 2 = 33
        assert out["signal"].iloc[:33].isna().all()
        assert out["signal"].iloc[33:].notna().all()
        assert out["histogram"].iloc[:33].isna().all()
        assert out["histogram"].iloc[33:].notna().all()

    def test_uptrend_has_positive_macd(self) -> None:
        close = pd.Series(np.linspace(100, 200, 100))
        out = macd(close)
        # In a steady uptrend, fast EMA > slow EMA, so macd > 0.
        assert (out["macd"].iloc[25:] > 0).all()

    def test_invalid_fast_slow_raises(self) -> None:
        close = pd.Series(np.linspace(100, 120, 100))
        with pytest.raises(ValueError, match=r"fast .* must be < slow"):
            macd(close, fast=26, slow=12)
