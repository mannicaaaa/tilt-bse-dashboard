"""Market data provider interface + shared types.

Every provider returns the **same** OHLCV shape so the rest of the app never
branches on data source:

- pandas.DataFrame indexed by ``date`` (DatetimeIndex, tz-naive, normalized to
  midnight UTC).
- Columns exactly: ``open``, ``high``, ``low``, ``close``, ``volume`` —
  lowercase, in that order.

Providers that fail for a single ticker simply omit it from the returned dict.
That is **not** an error condition (the stock may be delisted, the date range
may predate the listing, etc). A ``ProviderError`` is reserved for failures
that take the entire provider down — network, auth, rate limit, malformed
upstream response. The ``DataFetcher`` reacts to ``ProviderError`` by trying
the next provider in the chain.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date
from typing import ClassVar

import pandas as pd

OHLCV_COLUMNS: tuple[str, ...] = ("open", "high", "low", "close", "volume")


class ProviderError(Exception):
    """Raised when a provider cannot serve any data at all (not per-ticker)."""

    def __init__(self, provider: str, message: str) -> None:
        super().__init__(f"[{provider}] {message}")
        self.provider = provider
        self.message = message


class MarketDataProvider(ABC):
    """Abstract base for any source that can supply OHLCV.

    Subclasses set the ``name`` class variable (used in logs and ``FetchResult``)
    and implement ``fetch``.
    """

    name: ClassVar[str]

    @abstractmethod
    def fetch(
        self,
        tickers: list[str],
        start: date,
        end: date,
    ) -> dict[str, pd.DataFrame]:
        """Fetch OHLCV for the given tickers across ``[start, end]`` (inclusive).

        Returns a dict keyed by ticker. Tickers for which no data is available
        are simply omitted — callers should not assume every requested ticker
        appears in the result.

        Raises:
            ProviderError: when the provider itself cannot serve the request
                (network, auth, etc). Per-ticker failures do not raise.
        """
        ...
