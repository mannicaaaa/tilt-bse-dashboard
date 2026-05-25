"""Test fixtures for the API layer.

Builds a FastAPI app whose ``ScanService`` runs against an in-memory cache
pre-populated with synthetic OHLCV, so the suite hits no network.
"""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from tests.data.conftest import FakeProvider
from tilt.api.app import create_app
from tilt.api.routes import (
    get_data_fetcher,
    get_portfolio_provider,
    get_scan_service,
)
from tilt.api.service import ScanService
from tilt.data import DataFetcher, ParquetCache
from tilt.portfolio import EmptyPortfolioProvider
from tilt.universe import get_universe


def _synthetic(ticker_seed: int) -> pd.DataFrame:
    """260 bars of synthetic OHLCV with a rally pattern: pullback then bounce."""
    n = 260
    rng = np.random.default_rng(ticker_seed)
    base = np.linspace(80, 180, n) + rng.standard_normal(n) * 1.0
    base[-20:] = base[-21] * np.linspace(1.0, 0.85, 20)
    base[-5:] = base[-6] * np.linspace(1.0, 1.05, 5)
    end = date.today()
    idx = pd.bdate_range(end=end, periods=n)
    return pd.DataFrame(
        {
            "open": base * (1 + rng.standard_normal(n) * 0.001),
            "high": base * 1.005,
            "low": base * 0.995,
            "close": base,
            "volume": rng.integers(1_000_000, 5_000_000, size=n),
        },
        index=idx,
    )


@pytest.fixture
def api_client(tmp_path: Path) -> TestClient:
    """TestClient backed by an in-memory provider + tmp parquet cache."""
    universe = get_universe()
    provider_data = {s.ticker: _synthetic(i) for i, s in enumerate(universe)}
    fake = FakeProvider("synthetic", data=provider_data)
    cache = ParquetCache(tmp_path / "cache")
    fetcher = DataFetcher(providers=[fake], cache=cache)
    service = ScanService(fetcher)

    app = create_app()
    app.dependency_overrides[get_data_fetcher] = lambda: fetcher
    app.dependency_overrides[get_scan_service] = lambda: service
    app.dependency_overrides[get_portfolio_provider] = EmptyPortfolioProvider

    with TestClient(app) as client:
        yield client


@pytest.fixture
def date_today() -> date:
    return date.today()


@pytest.fixture
def lookback_start(date_today: date) -> date:
    return date_today - timedelta(days=365)
