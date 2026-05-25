"""MockPortfolioProvider — reads ``data/mock_portfolio.json``.

Build-time provider. Lets the entire portfolio surface (``/portfolio``,
``/scan/averaging``, ``/scan/traps``, Hold/Average/Sell tagging) be
demoed before live Groww credentials are wired at step 17. The same
``PortfolioProvider`` interface backs both.
"""

from __future__ import annotations

import json
from pathlib import Path

from tilt.portfolio.models import Holding, Portfolio
from tilt.portfolio.provider import PortfolioProvider

DEFAULT_MOCK_PATH = Path("data/mock_portfolio.json")


class MockPortfolioProvider(PortfolioProvider):
    def __init__(self, path: Path | str | None = None) -> None:
        self.path = Path(path) if path else DEFAULT_MOCK_PATH

    def get_portfolio(self) -> Portfolio:
        if not self.path.exists():
            raise FileNotFoundError(
                f"Mock portfolio file not found: {self.path}. "
                "Create one or switch PORTFOLIO_PROVIDER env var."
            )
        with self.path.open() as f:
            raw = json.load(f)
        holdings = [
            Holding(
                ticker=item["ticker"],
                quantity=int(item["quantity"]),
                avg_buy_price=float(item["avg_buy_price"]),
            )
            for item in raw.get("holdings", [])
        ]
        return Portfolio(holdings=holdings, cash=float(raw.get("cash", 0.0)))
