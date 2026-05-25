"""Parquet OHLCV cache — per-ticker file, cumulative date range, slice on read.

Design choice: rather than key the cache on ``(ticker, start, end)`` and store
one file per range — which would miss the cache whenever the requested window
shifts by a single day — we store one parquet per ticker containing every row
we have ever fetched for that ticker, and slice on read. A fetch request hits
the cache iff its ``[start, end]`` window is fully covered by the file's
existing range.

That trade buys us:
- A ``/refresh`` button that mostly hits cache for any historical-data needs
  and only goes to the network for the rolling tail (today's bar).
- A backtest that runs once at 1-year, then a Loom take-2 at 9-month, both
  served from cache.

What it costs: cache invalidation if a corporate action (split, dividend)
retroactively rewrites historical bars. For Indian equities and yfinance,
splits are reflected in the latest history fetch, so the merge logic
deduplicates by date and prefers the freshest write — corp-actions get picked
up on the next refresh of the affected ticker.
"""

from __future__ import annotations

import logging
from datetime import date
from pathlib import Path

import pandas as pd

from tilt.data.provider import OHLCV_COLUMNS

log = logging.getLogger(__name__)


class ParquetCache:
    """Per-ticker parquet OHLCV cache."""

    def __init__(self, root: Path | str) -> None:
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, ticker: str) -> Path:
        return self.root / f"{ticker.upper()}.parquet"

    def _safe_read(self, path: Path) -> pd.DataFrame | None:
        """Read a parquet, deleting the file if it's corrupted.

        Render's free tier kills processes aggressively (memory, idle timeout)
        and can leave half-written parquets on disk. A subsequent read of a
        truncated file raises ``pyarrow.lib.ArrowInvalid`` and would 500 the
        entire request — turning a transient write interruption into a
        permanent service outage. Treat any read error as a cache miss,
        nuke the bad file, and let the fetcher fall through to providers.
        """
        try:
            return pd.read_parquet(path)
        except Exception as e:
            log.warning("Corrupted parquet at %s — deleting and treating as miss (%s)", path, e)
            path.unlink(missing_ok=True)
            return None

    def get(self, ticker: str, start: date, end: date) -> pd.DataFrame | None:
        """Return cached OHLCV in ``[start, end]`` iff the cache fully covers it.

        "Covers" is checked against the *trading days* in the calendar range
        (Mon-Fri via ``pd.bdate_range``), not the raw calendar boundaries —
        otherwise a request for ``[Sat, Wed]`` would falsely miss when the
        cache only has the Mon-Wed bars (which is all the market produced).
        Indian-market holidays inside the range will cause harmless re-fetches
        the first time they're crossed; not worth a holiday-calendar dep for.

        Returns None on any of: file missing, file empty, file corrupted
        (deleted on the fly), range not fully covered. The fetcher treats
        None as a cache miss and falls through to providers.
        """
        path = self._path(ticker)
        if not path.exists():
            return None
        df = self._safe_read(path)
        if df is None or df.empty:
            return None

        expected = pd.bdate_range(start, end)
        if expected.empty:
            return df.iloc[0:0]  # range contains no trading days at all
        if df.index.min() > expected[0] or df.index.max() < expected[-1]:
            return None

        mask = (df.index.date >= start) & (df.index.date <= end)
        return df.loc[mask]

    def put(self, ticker: str, df: pd.DataFrame) -> None:
        """Merge ``df`` into the cache for ``ticker``.

        Atomic write: serialize to a sibling ``.tmp`` file, then rename onto
        the real path. POSIX ``rename`` is atomic, so a process kill during
        the write can leave a stray ``.tmp`` but never a truncated final
        parquet — which is what was 500-ing Render previously.

        On collision (same date in both new and existing), the new row wins —
        this matters for retroactive corp-action adjustments.
        """
        if df.empty:
            return
        path = self._path(ticker)
        if path.exists():
            existing = self._safe_read(path)
            if existing is not None and not existing.empty:
                combined = pd.concat([existing, df])
                combined = combined[~combined.index.duplicated(keep="last")].sort_index()
            else:
                combined = df.sort_index()
        else:
            combined = df.sort_index()

        tmp_path = path.with_suffix(".parquet.tmp")
        try:
            combined[list(OHLCV_COLUMNS)].to_parquet(tmp_path)
            tmp_path.replace(path)
        except Exception:
            # Clean up partial tmp before re-raising so we don't leave debris.
            tmp_path.unlink(missing_ok=True)
            raise

    def clear(self, ticker: str | None = None) -> None:
        """Delete cached parquet for one ticker, or all tickers if None."""
        if ticker is None:
            for path in self.root.glob("*.parquet"):
                path.unlink()
        else:
            path = self._path(ticker)
            if path.exists():
                path.unlink()
