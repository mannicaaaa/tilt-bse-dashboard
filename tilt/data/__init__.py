"""Market data layer — OHLCV provider abstraction + parquet cache + fetcher.

The single ``DataFetcher`` is the only object the rest of the app should talk
to. It owns a chain of providers (primary first, fallbacks after) and a cache,
and exposes a uniform ``fetch()`` regardless of where the data ends up coming
from. Reasoning lives in ``tilt/data/fetcher.py``.
"""

from __future__ import annotations

from tilt.data.bhavcopy_provider import BhavcopyProvider
from tilt.data.cache import ParquetCache
from tilt.data.fetcher import DataFetcher, FetchResult
from tilt.data.provider import MarketDataProvider, ProviderError
from tilt.data.snapshot_provider import SnapshotProvider
from tilt.data.yfinance_provider import YFinanceProvider

__all__ = [
    "BhavcopyProvider",
    "DataFetcher",
    "FetchResult",
    "MarketDataProvider",
    "ParquetCache",
    "ProviderError",
    "SnapshotProvider",
    "YFinanceProvider",
]
