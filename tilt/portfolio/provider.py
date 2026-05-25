"""PortfolioProvider abstract base + EmptyPortfolioProvider stub.

Same pattern as MarketDataProvider — concrete implementations (Mock, Groww)
live in their own modules and are selected at app-wire time by env var.
``EmptyPortfolioProvider`` is the safe default before step 10 lands the mock.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from tilt.portfolio.models import Portfolio


class PortfolioProvider(ABC):
    @abstractmethod
    def get_portfolio(self) -> Portfolio: ...


class EmptyPortfolioProvider(PortfolioProvider):
    """Returns no holdings. Lets the portfolio endpoints register before the
    Mock provider exists; replaced at step 10."""

    def get_portfolio(self) -> Portfolio:
        return Portfolio(holdings=[])
