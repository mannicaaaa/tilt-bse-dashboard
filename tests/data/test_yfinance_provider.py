"""YFinanceProvider — live-network integration test.

Skipped by default. Tests in this file hit the real Yahoo Finance API and so
are gated behind ``-m integration``. CI and the Render build must remain
network-free; this exists to manually sanity-check the provider after a
yfinance version bump.

Run with::

    pytest -m integration tests/data/test_yfinance_provider.py
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from tilt.data.provider import OHLCV_COLUMNS
from tilt.data.yfinance_provider import YFinanceProvider


@pytest.mark.integration
class TestYFinanceProviderLive:
    def test_fetches_reliance_recent(self) -> None:
        end = date.today() - timedelta(days=1)
        start = end - timedelta(days=30)

        provider = YFinanceProvider()
        result = provider.fetch(["RELIANCE"], start, end)

        assert "RELIANCE" in result
        df = result["RELIANCE"]
        assert list(df.columns) == list(OHLCV_COLUMNS)
        assert df.index.name == "date"
        assert df.index.tz is None
        assert len(df) > 10  # at least a couple weeks of business days

    def test_unknown_ticker_is_omitted(self) -> None:
        provider = YFinanceProvider()
        result = provider.fetch(["NOTAREALTICKER"], date(2025, 1, 1), date(2025, 1, 31))
        assert result == {}
