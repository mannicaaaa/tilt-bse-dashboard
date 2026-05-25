"""SnapshotProvider — reads a frozen OHLCV snapshot from per-ticker parquets.

Why: live yfinance is unreliable for demos (rate limits, partial bars,
ticker-rename hiccups). The snapshot pattern freezes a known-good day so
the dashboard always renders the same picks against the same data. The
interviewer can refresh 10 times in a row and get identical, fast results.

Trade: data is stale (the snapshot day is fixed). Disclosed in the
hero strip and in the API response as ``snapshot_date``.

Production upgrade: swap to a paid data feed (Trendlyne, Tickertape) via
``MARKET_DATA_PROVIDER=trendlyne`` — same ``MarketDataProvider`` interface,
zero changes elsewhere.

Capture flow: run ``python scripts/capture_snapshot.py YYYY-MM-DD`` to
refresh the snapshot. That writes per-ticker parquets here + a manifest
JSON with the snapshot date.
"""

from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path
from typing import ClassVar

import pandas as pd

from tilt.data.provider import OHLCV_COLUMNS, MarketDataProvider, ProviderError

log = logging.getLogger(__name__)

DEFAULT_SNAPSHOT_ROOT = Path("data/snapshot")
MANIFEST_FILENAME = "manifest.json"


class SnapshotProvider(MarketDataProvider):
    name: ClassVar[str] = "snapshot"

    def __init__(self, root: Path | str = DEFAULT_SNAPSHOT_ROOT) -> None:
        self.root = Path(root)
        self._manifest_cache: dict | None = None

    @property
    def manifest(self) -> dict:
        if self._manifest_cache is None:
            mpath = self.root / MANIFEST_FILENAME
            if not mpath.exists():
                raise ProviderError(
                    self.name,
                    f"snapshot manifest missing at {mpath} — "
                    "run `python scripts/capture_snapshot.py YYYY-MM-DD`",
                )
            self._manifest_cache = json.loads(mpath.read_text())
        return self._manifest_cache

    @property
    def snapshot_date(self) -> date:
        return date.fromisoformat(self.manifest["snapshot_date"])

    def fetch(
        self,
        tickers: list[str],
        start: date,
        end: date,
    ) -> dict[str, pd.DataFrame]:
        """Return cached OHLCV for tickers, sliced to [start, end] inclusive.

        The snapshot's own ``snapshot_date`` is the natural upper bound — any
        ``end`` past that just returns up to the snapshot date. ``start`` is
        respected so the existing 1-year-lookback windowing still works.
        """
        result: dict[str, pd.DataFrame] = {}
        for ticker in tickers:
            path = self.root / f"{ticker.upper()}.parquet"
            if not path.exists():
                continue  # missing tickers are silently omitted (per contract)
            try:
                df = pd.read_parquet(path)
            except Exception as e:
                log.warning("snapshot read failed for %s: %s", ticker, e)
                continue
            if df.empty:
                continue
            # Slice to requested window; clamp to what's available.
            mask = (df.index.date >= start) & (df.index.date <= end)
            sliced = df.loc[mask]
            if sliced.empty:
                continue
            result[ticker] = sliced[list(OHLCV_COLUMNS)]
        return result
