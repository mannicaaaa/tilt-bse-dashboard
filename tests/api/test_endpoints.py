"""Smoke tests for all 11 endpoints — schema + status only.

Goal here is the *contract*: every endpoint registers, returns 200 (or the
expected error), and its body parses against the Pydantic model. Detailed
filter-logic correctness lives in the signals/sectors test modules; this
file proves the routes wire those modules into the right shapes.
"""

from __future__ import annotations


class TestHealthAndRefresh:
    def test_health_returns_version(self, api_client) -> None:
        r = api_client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "version" in body

    def test_refresh_returns_run_stats(self, api_client) -> None:
        r = api_client.post("/refresh")
        assert r.status_code == 200
        body = r.json()
        for key in (
            "refreshed_at",
            "duration_seconds",
            "tickers_requested",
            "tickers_fetched",
            "cache_hits",
            "providers_used",
            "missing",
        ):
            assert key in body
        assert body["tickers_fetched"] > 0


class TestRallyScans:
    def test_scan_rally_envelope(self, api_client) -> None:
        r = api_client.get("/scan/rally")
        assert r.status_code == 200
        body = r.json()
        for key in ("generated_at", "stale_after", "count", "results"):
            assert key in body
        # Every row has the locked shape.
        for row in body["results"]:
            assert "score_breakdown" in row
            assert "filter_triggers" in row
            assert "indicators" in row
            assert isinstance(row["filter_triggers"], list)

    def test_scan_rally_conviction_only_hot(self, api_client) -> None:
        # First get the heatmap to know which sectors are Hot.
        heatmap = api_client.get("/sectors/heatmap").json()
        hot_sectors = {s["display_name"] for s in heatmap["sectors"] if s["tag"] == "Hot"}

        r = api_client.get("/scan/rally/conviction")
        assert r.status_code == 200
        body = r.json()
        for row in body["results"]:
            assert row["sector"] in hot_sectors

    def test_scan_rally_by_sector_dict_envelope(self, api_client) -> None:
        r = api_client.get("/scan/rally/by-sector")
        assert r.status_code == 200
        body = r.json()
        assert "sectors" in body
        assert isinstance(body["sectors"], dict)

    def test_scan_rally_limit_respected(self, api_client) -> None:
        r = api_client.get("/scan/rally?limit=3")
        assert r.status_code == 200
        assert len(r.json()["results"]) <= 3


class TestSectorsHeatmap:
    def test_returns_14_tiles(self, api_client) -> None:
        r = api_client.get("/sectors/heatmap")
        assert r.status_code == 200
        body = r.json()
        assert len(body["sectors"]) == 14
        ranks = [s["rank"] for s in body["sectors"]]
        assert ranks == sorted(ranks)  # rank 1 first

    def test_tag_split_is_4_6_4(self, api_client) -> None:
        body = api_client.get("/sectors/heatmap").json()
        tags = [s["tag"] for s in body["sectors"]]
        assert tags.count("Hot") == 4
        assert tags.count("Neutral") == 6
        assert tags.count("Cold") == 4


class TestPortfolioEndpoints:
    def test_empty_portfolio_returns_zero_holdings(self, api_client) -> None:
        r = api_client.get("/portfolio")
        assert r.status_code == 200
        body = r.json()
        assert body["count"] == 0
        assert body["holdings"] == []

    def test_scan_averaging_empty_when_no_holdings(self, api_client) -> None:
        r = api_client.get("/scan/averaging")
        assert r.status_code == 200
        assert r.json()["results"] == []

    def test_scan_traps_empty_when_no_holdings(self, api_client) -> None:
        r = api_client.get("/scan/traps")
        assert r.status_code == 200
        assert r.json()["results"] == []


class TestStockDetail:
    def test_known_ticker_returns_detail(self, api_client) -> None:
        r = api_client.get("/stock/RELIANCE")
        assert r.status_code == 200
        body = r.json()
        assert body["ticker"] == "RELIANCE"
        assert "indicator_series" in body
        assert "ohlcv" in body
        assert len(body["ohlcv"]) > 0

    def test_unknown_ticker_404(self, api_client) -> None:
        r = api_client.get("/stock/NOTAREALTICKER")
        assert r.status_code == 404


class TestBacktest:
    def test_returns_metrics_envelope(self, api_client) -> None:
        # The real engine lands at step 9; the endpoint already returns the shape.
        r = api_client.post("/backtest/rally?start=2024-01-01&end=2024-12-31")
        assert r.status_code == 200
        body = r.json()
        assert "metrics" in body
        for key in ("triggers", "hit_rate_30d", "avg_fwd_return_30d", "max_drawdown_per_signal"):
            assert key in body["metrics"]
