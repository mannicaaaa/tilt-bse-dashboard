"""ParquetCache — hit/miss semantics, range coverage, merge behavior."""

from __future__ import annotations

from datetime import date
from pathlib import Path

import pandas as pd
import pytest

from tilt.data.cache import ParquetCache


@pytest.fixture
def cache(tmp_path: Path) -> ParquetCache:
    return ParquetCache(tmp_path / "cache")


class TestParquetCache:
    def test_miss_when_file_absent(self, cache: ParquetCache) -> None:
        assert cache.get("RELIANCE", date(2025, 1, 1), date(2025, 6, 30)) is None

    def test_roundtrip_within_cached_range(self, cache: ParquetCache, synthetic_ohlcv) -> None:
        start, end = date(2025, 1, 1), date(2025, 12, 31)
        df = synthetic_ohlcv(start, end, seed=1)
        cache.put("RELIANCE", df)

        out = cache.get("RELIANCE", date(2025, 6, 1), date(2025, 6, 30))

        assert out is not None
        assert len(out) > 0
        assert out.index.min().date() >= date(2025, 6, 1)
        assert out.index.max().date() <= date(2025, 6, 30)

    def test_miss_when_request_extends_past_cache(
        self, cache: ParquetCache, synthetic_ohlcv
    ) -> None:
        df = synthetic_ohlcv(date(2025, 1, 1), date(2025, 6, 30), seed=2)
        cache.put("INFY", df)

        # Requesting a range that extends past the cached end → miss.
        assert cache.get("INFY", date(2025, 1, 1), date(2025, 12, 31)) is None

    def test_miss_when_request_predates_cache(self, cache: ParquetCache, synthetic_ohlcv) -> None:
        df = synthetic_ohlcv(date(2025, 6, 1), date(2025, 12, 31), seed=3)
        cache.put("TCS", df)

        assert cache.get("TCS", date(2025, 1, 1), date(2025, 12, 31)) is None

    def test_put_merges_new_rows(self, cache: ParquetCache, synthetic_ohlcv) -> None:
        first = synthetic_ohlcv(date(2025, 1, 1), date(2025, 6, 30), seed=4)
        second = synthetic_ohlcv(date(2025, 7, 1), date(2025, 12, 31), seed=5)
        cache.put("HDFCBANK", first)
        cache.put("HDFCBANK", second)

        out = cache.get("HDFCBANK", date(2025, 1, 1), date(2025, 12, 31))
        assert out is not None
        assert out.index.min().date() <= date(2025, 1, 3)  # first business day
        assert out.index.max().date() >= date(2025, 12, 30)

    def test_put_dedupes_overlapping_dates_with_new_winning(
        self, cache: ParquetCache, synthetic_ohlcv
    ) -> None:
        # 2025-06-16 is a Monday — trading day, exists in synthetic_ohlcv.
        overlap_day = date(2025, 6, 16)
        first = synthetic_ohlcv(date(2025, 1, 1), date(2025, 6, 30), seed=6)
        first.loc[pd.Timestamp(overlap_day), "close"] = 100.0
        cache.put("ITC", first)

        # Overwrite the same date with close=999.
        second = pd.DataFrame(
            {"open": [999.0], "high": [999.0], "low": [999.0], "close": [999.0], "volume": [1]},
            index=pd.DatetimeIndex([pd.Timestamp(overlap_day)], name="date"),
        )
        cache.put("ITC", second)

        out = cache.get("ITC", overlap_day, overlap_day)
        assert out is not None
        assert out.loc[pd.Timestamp(overlap_day), "close"] == 999.0

    def test_put_empty_dataframe_is_noop(self, cache: ParquetCache) -> None:
        cache.put("EMPTY", pd.DataFrame())
        assert cache.get("EMPTY", date(2025, 1, 1), date(2025, 1, 31)) is None

    def test_clear_single_ticker(self, cache: ParquetCache, synthetic_ohlcv) -> None:
        cache.put("A", synthetic_ohlcv(date(2025, 1, 1), date(2025, 6, 30), seed=7))
        cache.put("B", synthetic_ohlcv(date(2025, 1, 1), date(2025, 6, 30), seed=8))
        cache.clear("A")
        assert cache.get("A", date(2025, 1, 1), date(2025, 6, 30)) is None
        assert cache.get("B", date(2025, 1, 1), date(2025, 6, 30)) is not None

    def test_clear_all(self, cache: ParquetCache, synthetic_ohlcv) -> None:
        cache.put("A", synthetic_ohlcv(date(2025, 1, 1), date(2025, 6, 30), seed=9))
        cache.put("B", synthetic_ohlcv(date(2025, 1, 1), date(2025, 6, 30), seed=10))
        cache.clear()
        assert cache.get("A", date(2025, 1, 1), date(2025, 6, 30)) is None
        assert cache.get("B", date(2025, 1, 1), date(2025, 6, 30)) is None

    def test_ticker_case_insensitive(self, cache: ParquetCache, synthetic_ohlcv) -> None:
        df = synthetic_ohlcv(date(2025, 1, 1), date(2025, 6, 30), seed=11)
        cache.put("reliance", df)
        # Stored uppercase, retrievable case-insensitively.
        assert cache.get("RELIANCE", date(2025, 1, 1), date(2025, 6, 30)) is not None
        assert cache.get("reliance", date(2025, 1, 1), date(2025, 6, 30)) is not None
