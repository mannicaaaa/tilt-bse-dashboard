"""LLM narrative layer — Gemini-powered thesis + market-read text.

Wraps Google's Gemini Flash model behind an ``LLMProvider`` ABC so the rest
of the app never branches on whether an API key is present. When
``GEMINI_API_KEY`` is missing or the SDK is not installed, the
``DeterministicProvider`` fallback synthesizes text from the same pros/cons
logic the recommendation engine already computes — frontend rendering is
identical either way.

Every call is grounded: prompts explicitly forbid the model from inventing
numbers and only allow it to paraphrase indicator values supplied by the
caller. Results are cached on disk under ``data/llm_cache/`` keyed by
``(ticker, snapshot_date)`` so the same input always produces the same
thesis and we never pay twice for the same generation.
"""

from __future__ import annotations

from tilt.llm.cache import LLMCache
from tilt.llm.prompts import build_market_read_prompt, build_thesis_prompt
from tilt.llm.provider import (
    DeterministicProvider,
    GeminiProvider,
    LLMProvider,
    get_default_provider,
)

__all__ = [
    "DeterministicProvider",
    "GeminiProvider",
    "LLMCache",
    "LLMProvider",
    "build_market_read_prompt",
    "build_thesis_prompt",
    "get_default_provider",
]
