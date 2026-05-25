"""Mutual fund holdings loader + smart-money signal derivation.

Reads ``data/mutual_fund_holdings.csv`` — a hand-curated monthly snapshot of
top Indian equity MF holdings — and exposes:

- ``load_mf_holdings()`` → ``list[MutualFund]``
- ``smart_money_context(ticker, funds)`` → MFContext or None
- ``mf_universe(funds)`` → set of tickers held by ≥1 tracked fund

There is no public/free API for Indian MF portfolio holdings. SEBI mandates
monthly disclosure; each AMC publishes a PDF factsheet. The CSV is the
build-time representation of those factsheets. Production upgrade path: a
``MFHoldingsProvider`` ABC fronted by a paid aggregator (Tickertape, etc.)
behind the same interface — same pattern as ``MarketDataProvider``.
"""

from __future__ import annotations

from tilt.funds.loader import (
    DEFAULT_MF_CSV_PATH,
    MutualFund,
    load_mf_holdings,
)
from tilt.funds.signals import MFContext, mf_universe, smart_money_context

__all__ = [
    "DEFAULT_MF_CSV_PATH",
    "MFContext",
    "MutualFund",
    "load_mf_holdings",
    "mf_universe",
    "smart_money_context",
]
