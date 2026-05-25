"""Portfolio + Holding dataclasses."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Holding:
    ticker: str
    quantity: int
    avg_buy_price: float


@dataclass(frozen=True)
class Portfolio:
    holdings: list[Holding] = field(default_factory=list)
    cash: float = 0.0

    @property
    def total_invested(self) -> float:
        return sum(h.quantity * h.avg_buy_price for h in self.holdings)

    def ticker_set(self) -> set[str]:
        return {h.ticker for h in self.holdings}
