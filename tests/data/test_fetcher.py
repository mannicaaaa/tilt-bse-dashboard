"""DataFetcher — cache priority, provider fallback chain, observability."""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.data.conftest import FakeProvider
from tilt.data import DataFetcher, ParquetCache


@pytest.fixture
def cache(tmp_path: Path) -> ParquetCache:
    return ParquetCache(tmp_path / "cache")


class TestDataFetcher:
    def test_requires_at_least_one_provider(self, cache: ParquetCache) -> None:
        with pytest.raises(ValueError, match="at least one provider required"):
            DataFetcher(providers=[], cache=cache)

    def test_cache_hit_skips_providers(
        self, cache: ParquetCache, synthetic_ohlcv, date_range
    ) -> None:
        start, end = date_range
        cache.put("RELIANCE", synthetic_ohlcv(start, end, seed=1))

        provider = FakeProvider("primary")
        fetcher = DataFetcher([provider], cache)

        result = fetcher.fetch(["RELIANCE"], start, end)

        assert result.cache_hits == 1
        assert result.providers_used == {}
        assert "RELIANCE" in result.data
        assert provider.call_log == []  # provider never touched

    def test_cache_miss_falls_through_to_provider(
        self, cache: ParquetCache, synthetic_ohlcv, date_range
    ) -> None:
        start, end = date_range
        provider_data = {"INFY": synthetic_ohlcv(start, end, seed=2)}
        provider = FakeProvider("primary", data=provider_data)
        fetcher = DataFetcher([provider], cache)

        result = fetcher.fetch(["INFY"], start, end)

        assert result.cache_hits == 0
        assert result.providers_used == {"INFY": "primary"}
        assert "INFY" in result.data
        assert len(provider.call_log) == 1

    def test_provider_chain_falls_back_on_error(
        self, cache: ParquetCache, synthetic_ohlcv, date_range
    ) -> None:
        start, end = date_range
        primary = FakeProvider("yfinance", raise_on_call=True)
        secondary = FakeProvider(
            "bhavcopy", data={"TATAPOWER": synthetic_ohlcv(start, end, seed=3)}
        )
        fetcher = DataFetcher([primary, secondary], cache)

        result = fetcher.fetch(["TATAPOWER"], start, end)

        assert result.providers_used == {"TATAPOWER": "bhavcopy"}
        assert "TATAPOWER" in result.data
        assert len(primary.call_log) == 1  # tried
        assert len(secondary.call_log) == 1  # tried and succeeded

    def test_missing_ticker_recorded_not_raised(self, cache: ParquetCache, date_range) -> None:
        start, end = date_range
        # Provider returns nothing for a ticker that doesn't exist upstream.
        provider = FakeProvider("primary", data={})
        fetcher = DataFetcher([provider], cache)

        result = fetcher.fetch(["NOPE"], start, end)

        assert result.data == {}
        assert result.missing == ["NOPE"]

    def test_fetched_data_is_cached_for_next_call(
        self, cache: ParquetCache, synthetic_ohlcv, date_range
    ) -> None:
        start, end = date_range
        provider = FakeProvider("primary", data={"WIPRO": synthetic_ohlcv(start, end, seed=4)})
        fetcher = DataFetcher([provider], cache)

        first = fetcher.fetch(["WIPRO"], start, end)
        second = fetcher.fetch(["WIPRO"], start, end)

        assert first.cache_hits == 0
        assert second.cache_hits == 1
        assert len(provider.call_log) == 1  # only first call hit the provider

    def test_force_refresh_bypasses_cache(
        self, cache: ParquetCache, synthetic_ohlcv, date_range
    ) -> None:
        start, end = date_range
        cache.put("ITC", synthetic_ohlcv(start, end, seed=5))
        provider = FakeProvider("primary", data={"ITC": synthetic_ohlcv(start, end, seed=6)})
        fetcher = DataFetcher([provider], cache)

        result = fetcher.fetch(["ITC"], start, end, force_refresh=True)

        assert result.cache_hits == 0
        assert result.providers_used == {"ITC": "primary"}
        assert len(provider.call_log) == 1

    def test_mixed_batch_hits_and_misses(
        self, cache: ParquetCache, synthetic_ohlcv, date_range
    ) -> None:
        start, end = date_range
        cache.put("CACHED", synthetic_ohlcv(start, end, seed=7))
        provider = FakeProvider("primary", data={"FRESH": synthetic_ohlcv(start, end, seed=8)})
        fetcher = DataFetcher([provider], cache)

        result = fetcher.fetch(["CACHED", "FRESH", "MISSING"], start, end)

        assert result.count == 2
        assert result.cache_hits == 1
        assert result.providers_used == {"FRESH": "primary"}
        assert result.missing == ["MISSING"]
