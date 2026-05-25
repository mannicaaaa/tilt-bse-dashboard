"""LLM provider interface + Gemini and Deterministic implementations.

Same swappable pattern as ``MarketDataProvider``: an ABC at the top, two
concrete subclasses, and a factory that picks one based on env vars.

The deterministic provider is not a stub — it produces real, useful prose
stitched from the pros/cons logic. The frontend renders it identically to
Gemini output. This means the demo always works, even with no API key, and
CI never makes network calls.
"""

from __future__ import annotations

import os
from abc import ABC, abstractmethod
from typing import Any

from tilt.llm.cache import CacheKey, LLMCache


class LLMProvider(ABC):
    """Abstract base for any text-generation backend.

    Implementations focus on the two product calls we actually make: a
    per-stock buy thesis and a daily market-read paragraph. Both take
    pre-formatted prompts plus the structured inputs they were built from —
    the structured inputs are what the deterministic fallback needs in order
    to synthesize meaningful text without an LLM.
    """

    name: str = "base"

    @abstractmethod
    def generate_thesis(
        self,
        *,
        prompt: str,
        ticker: str,
        name: str,
        pros: list[str],
        cons: list[str],
        mf_context: dict[str, Any] | None = None,
        short: bool = False,
    ) -> str:
        """Return the thesis text. ``short=True`` requests a one-sentence variant."""
        ...

    @abstractmethod
    def generate_market_read(
        self,
        *,
        prompt: str,
        snapshot_date: str,
        tickers_scanned: int,
        lane_counts: dict[str, int],
        top_3_sectors: list[tuple[str, float]],
        bottom_3_sectors: list[tuple[str, float]],
    ) -> str: ...


# --- Deterministic fallback ------------------------------------------------


def _stitch_pros_into_thesis(ticker: str, pros: list[str], short: bool = False) -> str:
    """Build 1-3 sentence thesis from the pros list.

    Mirrors the spec's deterministic-fallback rules: first pro becomes the
    headline claim, second adds support, third adds depth (if present).
    """
    if not pros:
        return f"{ticker} cleared the lane filter but no additional pros were derived."

    cleaned = [p.strip().rstrip(".") for p in pros if p and p.strip()]
    if not cleaned:
        return f"{ticker} cleared the lane filter but no additional pros were derived."

    if short:
        # One-sentence variant for supporting picks.
        return f"{cleaned[0]}."

    lowered = [c[0].lower() + c[1:] if c else c for c in cleaned]
    sentences = [f"{ticker} is showing {lowered[0]}."]
    if len(lowered) > 1:
        sentences.append(f"Additionally, {lowered[1]}.")
    if len(lowered) > 2:
        sentences.append(f"{cleaned[2]}.")
    return " ".join(sentences)


def _derive_regime(lane_counts: dict[str, int]) -> str:
    """Classify the day from lane distribution: corrective / trending / mixed."""
    value = lane_counts.get("value", 0)
    momentum = lane_counts.get("momentum", 0)
    strong = lane_counts.get("strong", 0)
    total = sum(lane_counts.values()) or 1

    value_share = value / total
    momentum_share = (momentum + strong) / total

    if value_share >= 0.5 and value_share > momentum_share:
        return "corrective"
    if momentum_share >= 0.5 and momentum_share > value_share:
        return "trending"
    return "mixed"


def _biggest_lane(lane_counts: dict[str, int]) -> str:
    if not lane_counts:
        return "(none)"
    name = max(lane_counts.items(), key=lambda kv: kv[1])[0]
    return name.replace("_", " ").title()


class DeterministicProvider(LLMProvider):
    """No-LLM fallback. Builds text from existing pros + lane logic."""

    name = "deterministic"

    def generate_thesis(
        self,
        *,
        prompt: str,
        ticker: str,
        name: str,
        pros: list[str],
        cons: list[str],
        mf_context: dict[str, Any] | None = None,
        short: bool = False,
    ) -> str:
        text = _stitch_pros_into_thesis(ticker, pros, short=short)
        if mf_context and mf_context.get("funds_count") and not short:
            funds_count = mf_context["funds_count"]
            text = f"{text} Held by {funds_count} tracked mutual fund{'s' if funds_count != 1 else ''}, adding fundamental conviction."
        return text

    def generate_market_read(
        self,
        *,
        prompt: str,
        snapshot_date: str,
        tickers_scanned: int,
        lane_counts: dict[str, int],
        top_3_sectors: list[tuple[str, float]],
        bottom_3_sectors: list[tuple[str, float]],
    ) -> str:
        regime = _derive_regime(lane_counts)
        biggest = _biggest_lane(lane_counts)
        biggest_count = max(lane_counts.values()) if lane_counts else 0
        strong_count = lane_counts.get("strong", 0)
        top_sector_name = top_3_sectors[0][0] if top_3_sectors else "no sector"
        return (
            f"Markets are in a {regime} phase today. "
            f"The {biggest} lane is broad at {biggest_count} candidates while only "
            f"{strong_count} stock{'s' if strong_count != 1 else ''} cleared the strict Strong filter. "
            f"{top_sector_name} is the strongest sector by relative momentum."
        )


# --- Gemini implementation -------------------------------------------------


class GeminiProvider(LLMProvider):
    """Google Gemini Flash adapter (new google-genai SDK).

    Imports lazily so the rest of the app doesn't require the SDK installed.
    The factory picks the deterministic fallback when import fails or no key
    is configured.
    """

    name = "gemini"

    def __init__(
        self,
        api_key: str,
        *,
        cache: LLMCache | None = None,
        model_name: str = "gemini-2.5-flash",
        fallback: LLMProvider | None = None,
    ) -> None:
        self.api_key = api_key
        self.model_name = model_name
        self.cache = cache
        self.fallback = fallback or DeterministicProvider()
        self._client: Any | None = None

    def _ensure_client(self) -> Any | None:
        if self._client is not None:
            return self._client
        try:
            from google import genai  # type: ignore[import-not-found]
        except ImportError:
            return None
        self._client = genai.Client(api_key=self.api_key)
        return self._client

    def _call(self, prompt: str) -> str | None:
        client = self._ensure_client()
        if client is None:
            return None
        try:
            resp = client.models.generate_content(
                model=self.model_name,
                contents=prompt,
            )
            text = getattr(resp, "text", None)
            if isinstance(text, str) and text.strip():
                return text.strip()
        except Exception as e:
            # Log but don't crash — fallback will handle it.
            import logging

            logging.getLogger(__name__).warning("Gemini call failed: %s", e)
            return None
        return None

    def generate_thesis(
        self,
        *,
        prompt: str,
        ticker: str,
        name: str,
        pros: list[str],
        cons: list[str],
        mf_context: dict[str, Any] | None = None,
        short: bool = False,
    ) -> str:
        text = self._call(prompt)
        if text is None:
            return self.fallback.generate_thesis(
                prompt=prompt,
                ticker=ticker,
                name=name,
                pros=pros,
                cons=cons,
                mf_context=mf_context,
                short=short,
            )
        return text

    def generate_market_read(
        self,
        *,
        prompt: str,
        snapshot_date: str,
        tickers_scanned: int,
        lane_counts: dict[str, int],
        top_3_sectors: list[tuple[str, float]],
        bottom_3_sectors: list[tuple[str, float]],
    ) -> str:
        text = self._call(prompt)
        if text is None:
            return self.fallback.generate_market_read(
                prompt=prompt,
                snapshot_date=snapshot_date,
                tickers_scanned=tickers_scanned,
                lane_counts=lane_counts,
                top_3_sectors=top_3_sectors,
                bottom_3_sectors=bottom_3_sectors,
            )
        return text


# --- Cached wrapper --------------------------------------------------------


class CachedLLMProvider(LLMProvider):
    """Decorator that wraps any provider with disk-based memoization.

    Cache key is ``(kind, ticker, snapshot_date)`` — same input always returns
    the same text without re-calling the model. Skip the cache by passing
    ``snapshot_date=""``.
    """

    name = "cached"

    def __init__(self, inner: LLMProvider, cache: LLMCache) -> None:
        self.inner = inner
        self.cache = cache

    def generate_thesis(
        self,
        *,
        prompt: str,
        ticker: str,
        name: str,
        pros: list[str],
        cons: list[str],
        mf_context: dict[str, Any] | None = None,
        short: bool = False,
        snapshot_date: str = "",
    ) -> str:
        kind = "thesis_short" if short else "thesis"
        key = CacheKey(kind=kind, ticker=ticker, snapshot_date=snapshot_date)
        if snapshot_date:
            cached = self.cache.get(key)
            if cached is not None:
                return cached
        text = self.inner.generate_thesis(
            prompt=prompt,
            ticker=ticker,
            name=name,
            pros=pros,
            cons=cons,
            mf_context=mf_context,
            short=short,
        )
        if snapshot_date:
            self.cache.put(key, text, prompt=prompt)
        return text

    def generate_market_read(
        self,
        *,
        prompt: str,
        snapshot_date: str,
        tickers_scanned: int,
        lane_counts: dict[str, int],
        top_3_sectors: list[tuple[str, float]],
        bottom_3_sectors: list[tuple[str, float]],
    ) -> str:
        key = CacheKey(kind="market_read", ticker="", snapshot_date=snapshot_date)
        if snapshot_date:
            cached = self.cache.get(key)
            if cached is not None:
                return cached
        text = self.inner.generate_market_read(
            prompt=prompt,
            snapshot_date=snapshot_date,
            tickers_scanned=tickers_scanned,
            lane_counts=lane_counts,
            top_3_sectors=top_3_sectors,
            bottom_3_sectors=bottom_3_sectors,
        )
        if snapshot_date:
            self.cache.put(key, text, prompt=prompt)
        return text


# --- Factory ---------------------------------------------------------------


def get_default_provider(
    *,
    cache: LLMCache | None = None,
    env: dict[str, str] | None = None,
) -> LLMProvider:
    """Pick a provider from env: Gemini if ``GEMINI_API_KEY`` is set, else deterministic.

    Always wraps the chosen provider in ``CachedLLMProvider`` if a cache is
    supplied (or a default cache is created). Callers wanting raw access
    should instantiate providers directly.
    """
    env_lookup = env if env is not None else os.environ
    api_key = env_lookup.get("GEMINI_API_KEY", "").strip()
    cache = cache if cache is not None else LLMCache()

    inner: LLMProvider = (
        GeminiProvider(api_key=api_key, cache=cache) if api_key else DeterministicProvider()
    )
    return CachedLLMProvider(inner, cache)
