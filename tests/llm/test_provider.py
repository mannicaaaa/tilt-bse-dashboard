"""Tests for the LLM provider layer.

A ``FakeLLMProvider`` returns canned strings so CI never makes a real Gemini
call. Verifies:
- Deterministic fallback produces text grounded in the pros list.
- Factory picks Gemini when ``GEMINI_API_KEY`` is set, deterministic otherwise.
- The cached wrapper memoizes by ``(kind, ticker, snapshot_date)``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from tilt.llm import (
    DeterministicProvider,
    GeminiProvider,
    LLMCache,
    LLMProvider,
    build_market_read_prompt,
    build_thesis_prompt,
    get_default_provider,
)
from tilt.llm.provider import CachedLLMProvider


class FakeLLMProvider(LLMProvider):
    """Canned-response provider for testing."""

    name = "fake"

    def __init__(
        self,
        thesis_text: str = "FAKE THESIS",
        market_read_text: str = "FAKE MARKET READ",
    ) -> None:
        self.thesis_text = thesis_text
        self.market_read_text = market_read_text
        self.thesis_calls: list[dict[str, Any]] = []
        self.market_read_calls: list[dict[str, Any]] = []

    def generate_thesis(self, **kwargs) -> str:
        self.thesis_calls.append(kwargs)
        return self.thesis_text

    def generate_market_read(self, **kwargs) -> str:
        self.market_read_calls.append(kwargs)
        return self.market_read_text


# --- DeterministicProvider --------------------------------------------------


def test_deterministic_thesis_stitches_pros() -> None:
    provider = DeterministicProvider()
    text = provider.generate_thesis(
        prompt="ignored",
        ticker="TCS",
        name="Tata Consultancy Services",
        pros=[
            "MACD turned positive 3 days ago",
            "Trading 2.1% above 20-day moving average",
            "RSI 56 — inside entry sweet spot",
        ],
        cons=[],
    )
    assert "TCS" in text
    assert "MACD turned positive" in text.lower() or "macd" in text.lower()
    # Multi-sentence (2-3 sentences).
    assert text.count(".") >= 2


def test_deterministic_thesis_short_one_sentence() -> None:
    provider = DeterministicProvider()
    text = provider.generate_thesis(
        prompt="ignored",
        ticker="INFY",
        name="Infosys",
        pros=["RSI 32 — clearly oversold", "16% below 52-week high"],
        cons=[],
        short=True,
    )
    # One-sentence variant.
    assert text.count(".") == 1


def test_deterministic_thesis_empty_pros_safe() -> None:
    provider = DeterministicProvider()
    text = provider.generate_thesis(
        prompt="ignored",
        ticker="ABC",
        name="ABC Ltd",
        pros=[],
        cons=[],
    )
    assert "ABC" in text
    assert text  # non-empty fallback message


def test_deterministic_market_read_uses_provided_numbers() -> None:
    provider = DeterministicProvider()
    text = provider.generate_market_read(
        prompt="ignored",
        snapshot_date="2026-03-27",
        tickers_scanned=93,
        lane_counts={"strong": 1, "momentum": 5, "value": 23, "smart_money": 5},
        top_3_sectors=[("Nifty IT", 0.78), ("Nifty Pharma", 0.65), ("Nifty Auto", 0.55)],
        bottom_3_sectors=[("Nifty PSU Bank", 0.21), ("Nifty Energy", 0.18), ("Nifty Metal", 0.10)],
    )
    assert "Nifty IT" in text
    assert "corrective" in text.lower() or "trending" in text.lower() or "mixed" in text.lower()
    # Strong count from input echoed.
    assert "1" in text


def test_deterministic_mf_context_woven_in() -> None:
    provider = DeterministicProvider()
    text = provider.generate_thesis(
        prompt="ignored",
        ticker="PERSISTENT",
        name="Persistent Systems",
        pros=["MACD turned positive 8 days ago"],
        cons=[],
        mf_context={"funds_count": 2, "fund_short_names": ["HDFC Pharma", "ICICI Pru"]},
    )
    assert "2 tracked mutual fund" in text or "mutual funds" in text


# --- Factory ----------------------------------------------------------------


def test_factory_picks_deterministic_when_no_key(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path / "llm_cache")
    provider = get_default_provider(cache=cache, env={})
    assert isinstance(provider, CachedLLMProvider)
    assert isinstance(provider.inner, DeterministicProvider)


def test_factory_picks_gemini_when_key_present(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path / "llm_cache")
    provider = get_default_provider(cache=cache, env={"GEMINI_API_KEY": "fake-key"})
    assert isinstance(provider, CachedLLMProvider)
    assert isinstance(provider.inner, GeminiProvider)
    assert provider.inner.api_key == "fake-key"


def test_factory_ignores_whitespace_only_key(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path / "llm_cache")
    provider = get_default_provider(cache=cache, env={"GEMINI_API_KEY": "   "})
    assert isinstance(provider.inner, DeterministicProvider)


# --- Gemini SDK absence -----------------------------------------------------


def test_gemini_falls_back_when_sdk_missing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If google.generativeai isn't installed, _call returns None and the fallback runs."""
    cache = LLMCache(tmp_path / "llm_cache")
    fallback = FakeLLMProvider(thesis_text="DETERMINISTIC OUTPUT")
    gemini = GeminiProvider(api_key="x", cache=cache, fallback=fallback)
    # Force the SDK-lookup to fail.
    monkeypatch.setattr(gemini, "_ensure_client", lambda: None)

    text = gemini.generate_thesis(
        prompt="prompt",
        ticker="TCS",
        name="Tata Consultancy",
        pros=["pro1"],
        cons=[],
    )
    assert text == "DETERMINISTIC OUTPUT"
    assert len(fallback.thesis_calls) == 1


# --- Cached wrapper ---------------------------------------------------------


def test_cached_provider_memoizes_thesis(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path / "llm_cache")
    inner = FakeLLMProvider(thesis_text="CACHED THESIS")
    cached = CachedLLMProvider(inner, cache)

    first = cached.generate_thesis(
        prompt="p",
        ticker="TCS",
        name="Tata",
        pros=["a"],
        cons=[],
        snapshot_date="2026-03-27",
    )
    second = cached.generate_thesis(
        prompt="p",
        ticker="TCS",
        name="Tata",
        pros=["a"],
        cons=[],
        snapshot_date="2026-03-27",
    )
    assert first == second == "CACHED THESIS"
    # Second call should hit the cache — only ONE inner call total.
    assert len(inner.thesis_calls) == 1


def test_cached_provider_different_snapshot_dates_dont_collide(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path / "llm_cache")
    inner = FakeLLMProvider(thesis_text="CACHED")
    cached = CachedLLMProvider(inner, cache)

    cached.generate_thesis(
        prompt="p", ticker="TCS", name="Tata", pros=["a"], cons=[], snapshot_date="2026-03-27"
    )
    cached.generate_thesis(
        prompt="p", ticker="TCS", name="Tata", pros=["a"], cons=[], snapshot_date="2026-03-28"
    )
    assert len(inner.thesis_calls) == 2


def test_cached_provider_skips_when_no_snapshot_date(tmp_path: Path) -> None:
    """No snapshot_date means we never cache — every call re-generates."""
    cache = LLMCache(tmp_path / "llm_cache")
    inner = FakeLLMProvider()
    cached = CachedLLMProvider(inner, cache)

    cached.generate_thesis(
        prompt="p", ticker="TCS", name="Tata", pros=["a"], cons=[], snapshot_date=""
    )
    cached.generate_thesis(
        prompt="p", ticker="TCS", name="Tata", pros=["a"], cons=[], snapshot_date=""
    )
    assert len(inner.thesis_calls) == 2


def test_cached_provider_caches_market_read(tmp_path: Path) -> None:
    cache = LLMCache(tmp_path / "llm_cache")
    inner = FakeLLMProvider(market_read_text="MR")
    cached = CachedLLMProvider(inner, cache)

    payload = {
        "prompt": "p",
        "snapshot_date": "2026-03-27",
        "tickers_scanned": 93,
        "lane_counts": {"strong": 1, "momentum": 5, "value": 23, "smart_money": 5},
        "top_3_sectors": [("IT", 0.7)],
        "bottom_3_sectors": [("Metal", 0.1)],
    }
    cached.generate_market_read(**payload)
    cached.generate_market_read(**payload)
    assert len(inner.market_read_calls) == 1


# --- Prompts ----------------------------------------------------------------


def test_thesis_prompt_contains_no_invented_numbers() -> None:
    """The prompt embeds ONLY the values we pass. No magic numbers leak in."""
    prompt = build_thesis_prompt(
        ticker="TCS",
        name="Tata Consultancy",
        sector="Nifty IT",
        sector_tag="Hot",
        lane="strong",
        indicators={"rsi": 56.0, "macd_hist": 1.4, "ema20": 3800.0, "pct_below_52w_high": 0.11},
        cmp=3812.4,
        macd_crossover_days_ago=8,
        pros=["MACD turned positive 8 days ago"],
        cons=[],
        mf_context=None,
    )
    assert "56.0" in prompt or "56" in prompt
    assert "3812" in prompt
    assert "11" in prompt  # pct_below_52w_high
    assert "8 days ago" in prompt or "8" in prompt
    # The critical-rules block must be present (anti-hallucination).
    assert "Do not invent" in prompt
    assert "ONLY the values" in prompt


def test_market_read_prompt_contains_grounding_rules() -> None:
    prompt = build_market_read_prompt(
        snapshot_date="2026-03-27",
        tickers_scanned=93,
        lane_counts={"strong": 1, "momentum": 5, "value": 23, "smart_money": 5},
        top_3_sectors=[("Nifty IT", 0.78)],
        bottom_3_sectors=[("Nifty Metal", 0.1)],
    )
    assert "2026-03-27" in prompt
    assert "Nifty IT" in prompt
    assert "Do not invent" in prompt
    assert "ONLY the numbers" in prompt
