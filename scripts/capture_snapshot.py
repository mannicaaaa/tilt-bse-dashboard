"""One-time snapshot capture from yfinance.

Run this manually to refresh the frozen OHLCV snapshot the demo uses.
Output: per-ticker parquet files under ``data/snapshot/`` + a manifest
JSON with the snapshot date and ticker coverage stats.

Usage::

    python scripts/capture_snapshot.py 2026-03-27

The date is the *end* of the snapshot window. We pull 14 months back so
the 52-week-high computation has full data.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

from tilt.data import ParquetCache, YFinanceProvider
from tilt.data.provider import ProviderError
from tilt.universe import get_universe

LOOKBACK_DAYS = 14 * 30  # ~14 months for clean 52-week-high windows
SNAPSHOT_ROOT = Path("data/snapshot")


def main(end_date_str: str) -> None:
    end = datetime.fromisoformat(end_date_str).date()
    start = end - timedelta(days=LOOKBACK_DAYS)

    universe = get_universe()
    tickers = [s.ticker for s in universe]
    print(f"Capturing snapshot {start} → {end} for {len(tickers)} tickers...")

    SNAPSHOT_ROOT.mkdir(parents=True, exist_ok=True)
    cache = ParquetCache(SNAPSHOT_ROOT)
    provider = YFinanceProvider()

    success: list[str] = []
    missing: list[str] = []
    errored: list[str] = []

    for i, ticker in enumerate(tickers, 1):
        print(f"  [{i}/{len(tickers)}] {ticker}...", end=" ", flush=True)
        try:
            result = provider.fetch([ticker], start, end)
        except ProviderError as e:
            print(f"ERROR ({e})")
            errored.append(ticker)
            continue
        if ticker not in result:
            print("no data")
            missing.append(ticker)
            continue
        df = result[ticker]
        cache.put(ticker, df)
        success.append(ticker)
        print(f"{len(df)} bars")

    manifest = {
        "snapshot_date": end.isoformat(),
        "lookback_start": start.isoformat(),
        "captured_at": datetime.utcnow().isoformat() + "Z",
        "universe_size": len(tickers),
        "captured": len(success),
        "missing": missing,
        "errored": errored,
        "tickers": success,
    }
    manifest_path = SNAPSHOT_ROOT / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(f"\nDone. Captured {len(success)}/{len(tickers)}. Manifest: {manifest_path}")
    if missing:
        print(f"Missing ({len(missing)}): {', '.join(missing)}")
    if errored:
        print(f"Errored ({len(errored)}): {', '.join(errored)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/capture_snapshot.py YYYY-MM-DD")
        sys.exit(1)
    main(sys.argv[1])
