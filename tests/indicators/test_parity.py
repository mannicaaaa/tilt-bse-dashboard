"""Parity tests — Tilt indicators vs pandas-ta on identical inputs.

This is the headline test suite (see DEMO_STORYBOARD.md, Beat 5). The contract:
every value our implementation produces must agree with pandas-ta's reference
implementation to four decimal places, on deterministic synthetic OHLCV across
multiple regimes (short series, long series, trending, choppy).

NaN positions (warmup) must also match exactly — a parity test that passes on
values but disagrees on warmup length is hiding a seeding bug.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import pandas_ta as pta
import pytest

from tilt.indicators import macd, rsi

ATOL = 1e-4  # four-decimal-place agreement


def _random_walk(n: int, seed: int, vol: float = 0.02, start: float = 100.0) -> pd.Series:
    """Deterministic geometric random walk — stable across pytest runs."""
    rng = np.random.default_rng(seed)
    returns = rng.standard_normal(n) * vol
    return pd.Series(start * np.exp(returns.cumsum()), name="close")


@pytest.fixture
def short_close() -> pd.Series:
    return _random_walk(n=200, seed=42)


@pytest.fixture
def long_close() -> pd.Series:
    return _random_walk(n=1000, seed=123)


@pytest.fixture
def low_vol_close() -> pd.Series:
    return _random_walk(n=500, seed=7, vol=0.005)


@pytest.fixture
def high_vol_close() -> pd.Series:
    return _random_walk(n=500, seed=13, vol=0.05)


def _assert_series_parity(ours: pd.Series, theirs: pd.Series, label: str) -> None:
    """Assert NaN masks match exactly, and finite values agree within ATOL."""
    assert len(ours) == len(theirs), f"{label}: length mismatch"
    assert ours.isna().equals(theirs.isna()), (
        f"{label}: NaN masks differ — warmup seeding likely off. "
        f"ours NaN count={ours.isna().sum()}, theirs NaN count={theirs.isna().sum()}"
    )
    mask = ours.notna() & theirs.notna()
    np.testing.assert_allclose(
        ours[mask].to_numpy(),
        theirs[mask].to_numpy(),
        atol=ATOL,
        err_msg=f"{label}: value disagreement beyond {ATOL}",
    )


# --- RSI parity -------------------------------------------------------------


class TestRSIParity:
    @pytest.mark.parametrize("length", [7, 14, 21])
    def test_short_series(self, short_close: pd.Series, length: int) -> None:
        ours = rsi(short_close, length=length)
        theirs = pta.rsi(short_close, length=length)
        _assert_series_parity(ours, theirs, label=f"RSI length={length}")

    def test_long_series_default_length(self, long_close: pd.Series) -> None:
        ours = rsi(long_close, length=14)
        theirs = pta.rsi(long_close, length=14)
        _assert_series_parity(ours, theirs, label="RSI long")

    def test_low_volatility(self, low_vol_close: pd.Series) -> None:
        ours = rsi(low_vol_close, length=14)
        theirs = pta.rsi(low_vol_close, length=14)
        _assert_series_parity(ours, theirs, label="RSI low-vol")

    def test_high_volatility(self, high_vol_close: pd.Series) -> None:
        ours = rsi(high_vol_close, length=14)
        theirs = pta.rsi(high_vol_close, length=14)
        _assert_series_parity(ours, theirs, label="RSI high-vol")


# --- MACD parity ------------------------------------------------------------

# pandas-ta column naming: MACD_<fast>_<slow>_<signal>, MACDs_..., MACDh_...
_MACD_COLUMN_MAP = {
    "macd": "MACD_{fast}_{slow}_{signal}",
    "signal": "MACDs_{fast}_{slow}_{signal}",
    "histogram": "MACDh_{fast}_{slow}_{signal}",
}


def _assert_macd_parity(close: pd.Series, fast: int, slow: int, signal: int, label: str) -> None:
    ours = macd(close, fast=fast, slow=slow, signal=signal)
    theirs = pta.macd(close, fast=fast, slow=slow, signal=signal)
    for ours_col, theirs_col_tmpl in _MACD_COLUMN_MAP.items():
        theirs_col = theirs_col_tmpl.format(fast=fast, slow=slow, signal=signal)
        _assert_series_parity(
            ours[ours_col],
            theirs[theirs_col],
            label=f"{label}::{ours_col}",
        )


class TestMACDParity:
    def test_default_parameters_short(self, short_close: pd.Series) -> None:
        _assert_macd_parity(short_close, 12, 26, 9, label="MACD 12/26/9 short")

    def test_default_parameters_long(self, long_close: pd.Series) -> None:
        _assert_macd_parity(long_close, 12, 26, 9, label="MACD 12/26/9 long")

    def test_alternate_parameters(self, short_close: pd.Series) -> None:
        # A non-default trio to make sure parametrization is faithfully wired.
        _assert_macd_parity(short_close, 5, 13, 4, label="MACD 5/13/4")

    def test_low_volatility(self, low_vol_close: pd.Series) -> None:
        _assert_macd_parity(low_vol_close, 12, 26, 9, label="MACD low-vol")

    def test_high_volatility(self, high_vol_close: pd.Series) -> None:
        _assert_macd_parity(high_vol_close, 12, 26, 9, label="MACD high-vol")
