"""Shared fixtures for the data-layer tests.

Provides synthetic OHLCV frames and fake providers so the cache/fetcher tests
can exercise every code path with zero network traffic.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import ClassVar

import numpy as np
import pandas as pd
import pytest

from tilt.data.provider import OHLCV_COLUMNS, MarketDataProvider, ProviderError


def _synthetic_ohlcv(start: date, end: date, seed: int = 0) -> pd.DataFrame:
    """Generate a tz-naive OHLCV frame across business days in [start, end]."""
    idx = pd.bdate_range(start, end)
    rng = np.random.default_rng(seed)
    close = 100.0 * np.exp(rng.standard_normal(len(idx)).cumsum() * 0.01)
    df = pd.DataFrame(
        {
            "open": close * (1 + rng.standard_normal(len(idx)) * 0.001),
            "high": close * (1 + np.abs(rng.standard_normal(len(idx))) * 0.002),
            "low": close * (1 - np.abs(rng.standard_normal(len(idx))) * 0.002),
            "close": close,
            "volume": rng.integers(1_000_000, 10_000_000, size=len(idx)),
        },
        index=idx,
    )
    df.index.name = "date"
    return df[list(OHLCV_COLUMNS)]


@pytest.fixture
def synthetic_ohlcv():
    return _synthetic_ohlcv


@pytest.fixture
def date_range() -> tuple[date, date]:
    end = date(2025, 12, 31)
    start = end - timedelta(days=60)
    return start, end


class FakeProvider(MarketDataProvider):
    """Test provider that returns pre-seeded frames or raises on demand."""

    name: ClassVar[str] = "fake"

    def __init__(
        self,
        name: str,
        data: dict[str, pd.DataFrame] | None = None,
        raise_on_call: bool = False,
    ) -> None:
        self.name = name  # type: ignore[misc]
        self._data = data or {}
        self.raise_on_call = raise_on_call
        self.call_log: list[tuple[tuple[str, ...], date, date]] = []

    def fetch(
        self,
        tickers: list[str],
        start: date,
        end: date,
    ) -> dict[str, pd.DataFrame]:
        self.call_log.append((tuple(tickers), start, end))
        if self.raise_on_call:
            raise ProviderError(self.name, "scripted failure")
        return {t: self._data[t] for t in tickers if t in self._data}
