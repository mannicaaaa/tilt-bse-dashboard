"""Tests for the /scan/brief endpoint.

Verifies the v3 hero-shape contract (per docs/CLAUDE_DESIGN_PROMPT_V3.md):
- Envelope keys (snapshot_date, market_read, scan_stats, hero, supporting, sectors).
- Hero carries thesis + why_this.
- Supporting picks carry thesis_short.
- LLM provider name surfaces so the frontend / demo can see which path ran.

A FakeLLMProvider is injected via dependency_overrides — no real Gemini call.
"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.llm.test_provider import FakeLLMProvider
from tilt.api.routes import get_llm_provider


@pytest.fixture
def brief_client(api_client: TestClient) -> tuple[TestClient, FakeLLMProvider]:
    """Reuses api_client fixture but injects a deterministic fake LLM."""
    fake = FakeLLMProvider(
        thesis_text="Fake thesis paragraph from the test LLM.",
        market_read_text="Fake market read paragraph from the test LLM.",
    )
    api_client.app.dependency_overrides[get_llm_provider] = lambda: fake
    return api_client, fake


class TestBriefEnvelope:
    def test_returns_200_with_required_keys(self, brief_client) -> None:
        client, _ = brief_client
        r = client.get("/scan/brief")
        assert r.status_code == 200
        body = r.json()
        for key in (
            "snapshot_date",
            "generated_at",
            "market_read",
            "scan_stats",
            "hero",
            "supporting",
            "sectors",
            "llm_provider",
            "data_mode",
        ):
            assert key in body, f"missing key: {key}"

    def test_scan_stats_shape(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        stats = body["scan_stats"]
        assert "tickers_scanned" in stats
        assert "total_picks" in stats
        assert "lane_counts" in stats
        assert set(stats["lane_counts"].keys()) >= {"strong", "momentum", "value", "smart_money"}

    def test_llm_provider_surfaced(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        assert body["llm_provider"] == "fake"


class TestHeroPick:
    def test_hero_has_full_thesis(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        hero = body["hero"]
        assert hero is not None
        assert hero["thesis"] == "Fake thesis paragraph from the test LLM."
        # Why-this exclusivity line is built deterministically from lane counts.
        assert hero["why_this"] is not None
        assert "scanned" in hero["why_this"]

    def test_hero_carries_indicators_and_breakdown(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        hero = body["hero"]
        assert "indicators" in hero
        assert "score_breakdown" in hero
        # The locked indicator keys exist.
        for k in ("rsi", "macd_hist", "ema20", "pct_below_52w_high"):
            assert k in hero["indicators"]

    def test_hero_is_highest_scored(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        hero = body["hero"]
        for pick in body["supporting"]:
            assert hero["score"] >= pick["score"]


class TestSupportingPicks:
    def test_supporting_count_bounded(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        assert 0 <= len(body["supporting"]) <= 6

    def test_supporting_picks_have_short_thesis(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        for pick in body["supporting"]:
            assert pick["thesis_short"] is not None
            assert pick["thesis"] is None  # supporting picks don't get the long form
            assert "ticker" in pick
            assert "lane" in pick

    def test_supporting_excludes_hero(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        hero_ticker = body["hero"]["ticker"]
        supporting_tickers = [p["ticker"] for p in body["supporting"]]
        assert hero_ticker not in supporting_tickers


class TestSectorStrip:
    def test_sectors_payload_ranked(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        sectors = body["sectors"]
        assert len(sectors) == 14
        ranks = [s["rank"] for s in sectors]
        assert ranks == sorted(ranks)
        for s in sectors:
            assert s["state"] in {"hot", "neutral", "cold"}


class TestLLMIntegration:
    def test_fake_llm_was_called(self, brief_client) -> None:
        client, fake = brief_client
        client.get("/scan/brief")
        # Hero thesis + at least 1 supporting thesis_short.
        assert len(fake.thesis_calls) >= 1
        assert len(fake.market_read_calls) == 1

    def test_market_read_from_provider(self, brief_client) -> None:
        client, _ = brief_client
        body = client.get("/scan/brief").json()
        assert body["market_read"] == "Fake market read paragraph from the test LLM."


class TestDeterministicFallbackInBrief:
    """End-to-end: with no Gemini key, the real default provider is deterministic."""

    def test_brief_works_without_gemini_key(
        self, api_client: TestClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Force the default-provider factory to see no key, in case the env happens to have one.
        monkeypatch.delenv("GEMINI_API_KEY", raising=False)
        # Re-resolve to the real default provider (deterministic).
        api_client.app.dependency_overrides.pop(get_llm_provider, None)
        # Reset the module-level singleton so the env change takes effect.
        import tilt.api.routes as routes_mod

        routes_mod._llm_provider = None

        r = api_client.get("/scan/brief")
        assert r.status_code == 200
        body = r.json()
        # Deterministic fallback surfaces under that name (wrapped by cached but
        # we report inner.name).
        assert body["llm_provider"] == "deterministic"
        if body["hero"]:
            assert body["hero"]["thesis"]  # non-empty


def _ignore() -> Any:  # pragma: no cover — silence unused-import linters
    return FakeLLMProvider
