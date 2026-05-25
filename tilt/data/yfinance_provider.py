"""yfinance-backed OHLCV provider for NSE equities.

The ``.NS`` exchange suffix is added inside this provider so Tilt-side ticker
schemas stay clean (``RELIANCE``, not ``RELIANCE.NS``). yfinance returns
capitalized column names plus dividend/split columns we don't need — we
normalize to the lowercase OHLCV-only contract documented in ``provider.py``.

yfinance per-call patterns vary in reliability; for our purposes (a few
hundred Nifty 500 tickers fetched on demand), per-ticker ``Ticker.history()``
is simpler than batched ``yf.download``'s multi-index unpacking. Sacrifices
some throughput for legibility.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import ClassVar

import pandas as pd
import yfinance as yf

from tilt.data.provider import OHLCV_COLUMNS, MarketDataProvider, ProviderError


class YFinanceProvider(MarketDataProvider):
    name: ClassVar[str] = "yfinance"

    def __init__(self, exchange_suffix: str = ".NS") -> None:
        self.exchange_suffix = exchange_suffix

    def fetch(
        self,
        tickers: list[str],
        start: date,
        end: date,
    ) -> dict[str, pd.DataFrame]:
        # yfinance's `end` is exclusive; nudge it by one day so callers can
        # think of [start, end] as inclusive on both sides.
        yf_end = end + timedelta(days=1)
        result: dict[str, pd.DataFrame] = {}
        for ticker in tickers:
            symbol = f"{ticker}{self.exchange_suffix}"
            try:
                raw = yf.Ticker(symbol).history(
                    start=start.isoformat(),
                    end=yf_end.isoformat(),
                    auto_adjust=True,
                    actions=False,
                )
            except Exception as e:  # yfinance raises a mixed bag; treat as transport
                raise ProviderError(self.name, f"fetch {ticker}: {e}") from e
            if raw.empty:
                # Per the contract, missing tickers are omitted, not raised.
                continue
            result[ticker] = self._normalize(raw)
        return result

    @staticmethod
    def _normalize(df: pd.DataFrame) -> pd.DataFrame:
        rename = {
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
        df = df[list(rename.keys())].rename(columns=rename)
        df.index = pd.to_datetime(df.index).tz_localize(None).normalize()
        df.index.name = "date"
        return df[list(OHLCV_COLUMNS)]
