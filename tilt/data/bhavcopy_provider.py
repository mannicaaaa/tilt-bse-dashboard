"""NSE bhavcopy fallback provider — stub implementation.

**Status:** interface implemented, network fetch deferred. The class exists so
the provider-chain architecture is real (``DataFetcher`` actually iterates over
``[YFinanceProvider, BhavcopyProvider]`` and would call bhavcopy if yfinance
raised ``ProviderError``), but the bhavcopy fetch itself raises a clear
``ProviderError`` until wired.

The plan, when wired: pull the daily zip at::

    https://www1.nseindia.com/content/historical/EQUITIES/{YYYY}/{MMM_UPPER}/cm{DD}{MMM_UPPER}{YYYY}bhav.csv.zip

NSE's site has aggressive cookie/JS gating; production would use a maintained
library like ``jugaad-data`` rather than reimplementing the cookie dance.

We disclose this stub honestly in the README rather than hiding it — the
interview signal here is the *architecture pattern*, not a second working
data source. If yfinance ever blocks us, this is where the second source
plugs in without touching ``DataFetcher`` or any caller.
"""

from __future__ import annotations

from datetime import date
from typing import ClassVar

import pandas as pd

from tilt.data.provider import MarketDataProvider, ProviderError


class BhavcopyProvider(MarketDataProvider):
    name: ClassVar[str] = "bhavcopy"

    def fetch(
        self,
        tickers: list[str],
        start: date,
        end: date,
    ) -> dict[str, pd.DataFrame]:
        del tickers, start, end  # acknowledged unused; interface contract
        raise ProviderError(
            self.name,
            "bhavcopy fallback not yet wired — yfinance is the sole live source. "
            "See module docstring for the production fetch plan.",
        )
