"""DataFetcher — the single entry point the rest of the app uses for OHLCV.

Holds a cache and an ordered list of providers (primary first, fallbacks after).
For each ticker:

    cache hit?  ────→ return cached slice
        │ no
        ▼
    try provider 1 ──→ on success: cache + return
        │ ProviderError
        ▼
    try provider 2 ──→ on success: cache + return
        │ ProviderError
        ▼
    omit ticker from result + record in ``missing``

The ``FetchResult`` carries observability data (cache_hits, providers_used,
missing tickers) so the ``/refresh`` endpoint can show the one-line stat the
demo storyboard's Beat 3 calls for ("Refreshed in 3.2s · 47 tickers updated ·
12 cache hits").
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date

import pandas as pd

from tilt.data.cache import ParquetCache
from tilt.data.provider import MarketDataProvider, ProviderError

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class FetchResult:
    data: dict[str, pd.DataFrame]
    cache_hits: int = 0
    providers_used: dict[str, str] = field(default_factory=dict)
    missing: list[str] = field(default_factory=list)

    @property
    def count(self) -> int:
        return len(self.data)


class DataFetcher:
    def __init__(
        self,
        providers: list[MarketDataProvider],
        cache: ParquetCache,
    ) -> None:
        if not providers:
            raise ValueError("at least one provider required")
        self.providers = providers
        self.cache = cache

    def fetch(
        self,
        tickers: list[str],
        start: date,
        end: date,
        force_refresh: bool = False,
    ) -> FetchResult:
        data: dict[str, pd.DataFrame] = {}
        cache_hits = 0
        providers_used: dict[str, str] = {}
        missing: list[str] = []

        for ticker in tickers:
            if not force_refresh:
                cached = self.cache.get(ticker, start, end)
                if cached is not None:
                    data[ticker] = cached
                    cache_hits += 1
                    continue

            fetched = self._fetch_with_fallback(ticker, start, end, providers_used)
            if fetched is None:
                missing.append(ticker)
                continue
            self.cache.put(ticker, fetched)
            # Re-slice from cache so the returned frame is range-exact and
            # consistent with what a subsequent cache-hit fetch would return.
            sliced = self.cache.get(ticker, start, end)
            data[ticker] = sliced if sliced is not None else fetched

        return FetchResult(
            data=data,
            cache_hits=cache_hits,
            providers_used=providers_used,
            missing=missing,
        )

    def _fetch_with_fallback(
        self,
        ticker: str,
        start: date,
        end: date,
        providers_used: dict[str, str],
    ) -> pd.DataFrame | None:
        for provider in self.providers:
            try:
                result = provider.fetch([ticker], start, end)
            except ProviderError as e:
                log.warning("provider %s failed for %s: %s", provider.name, ticker, e)
                continue
            if ticker in result:
                providers_used[ticker] = provider.name
                return result[ticker]
        return None
