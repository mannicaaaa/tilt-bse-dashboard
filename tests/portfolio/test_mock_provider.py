"""MockPortfolioProvider — file loading + dataclass mapping."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tilt.portfolio import MockPortfolioProvider, Portfolio


def _write(tmp_path: Path, payload: dict) -> Path:
    p = tmp_path / "portfolio.json"
    p.write_text(json.dumps(payload))
    return p


class TestMockPortfolioProvider:
    def test_loads_holdings_and_cash(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            {
                "holdings": [
                    {"ticker": "RELIANCE", "quantity": 10, "avg_buy_price": 2500.0},
                    {"ticker": "TCS", "quantity": 5, "avg_buy_price": 3800.0},
                ],
                "cash": 15000.0,
            },
        )
        pf = MockPortfolioProvider(path).get_portfolio()
        assert isinstance(pf, Portfolio)
        assert len(pf.holdings) == 2
        assert pf.cash == 15000.0
        assert {h.ticker for h in pf.holdings} == {"RELIANCE", "TCS"}

    def test_total_invested_computed(self, tmp_path: Path) -> None:
        path = _write(
            tmp_path,
            {
                "holdings": [
                    {"ticker": "X", "quantity": 10, "avg_buy_price": 100.0},
                    {"ticker": "Y", "quantity": 20, "avg_buy_price": 50.0},
                ]
            },
        )
        pf = MockPortfolioProvider(path).get_portfolio()
        assert pf.total_invested == 2000.0  # 10*100 + 20*50

    def test_missing_file_raises(self, tmp_path: Path) -> None:
        provider = MockPortfolioProvider(tmp_path / "does_not_exist.json")
        with pytest.raises(FileNotFoundError, match="not found"):
            provider.get_portfolio()

    def test_empty_holdings_list_is_valid(self, tmp_path: Path) -> None:
        path = _write(tmp_path, {"holdings": [], "cash": 0.0})
        pf = MockPortfolioProvider(path).get_portfolio()
        assert pf.holdings == []
        assert pf.cash == 0.0

    def test_default_path_points_to_repo_mock(self) -> None:
        provider = MockPortfolioProvider()
        # Default reads data/mock_portfolio.json; the repo ships one.
        pf = provider.get_portfolio()
        assert len(pf.holdings) > 0
        assert pf.cash >= 0.0

    def test_all_default_mock_tickers_in_universe(self) -> None:
        from tilt.universe import get_universe

        pf = MockPortfolioProvider().get_portfolio()
        universe = {s.ticker for s in get_universe()}
        for h in pf.holdings:
            assert h.ticker in universe, (
                f"Mock holding {h.ticker} not in universe — would break /portfolio"
            )
