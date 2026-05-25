"""Grounded prompt templates for the LLM narrative layer.

Every template explicitly tells the model: use ONLY the values provided. The
model paraphrases — it does not synthesize fresh facts. This is the
hallucination-defense the demo storyboard rests on.
"""

from __future__ import annotations

import json
from typing import Any

THESIS_TEMPLATE = """You are a CFA-level equity analyst writing a 2-3 sentence buy thesis.

Stock: {ticker} ({name})
Sector: {sector} ({sector_tag})
Lane: {lane}
Indicators (these are the ONLY facts you may cite):
  RSI: {rsi}
  MACD histogram: {macd_hist}
  Price: Rs.{cmp}
  EMA20: Rs.{ema20}
  Distance below 52-week high: {pct_below_52w_high}%
  MACD crossover: {macd_crossover_days_ago} days ago
Mutual fund context: {mf_context}

Pros (already analyzed): {pros}
Cons (already analyzed): {cons}

CRITICAL RULES:
- Use ONLY the values above. Do not invent prices, percentages, or company facts.
- Write 2-3 sentences total. Plain English. No jargon-heavy phrasing.
- Explain WHY the technical signals matter for an entry decision.
- If MF context is present, weave in that fund-manager conviction.
- Do not output disclaimers, ratings, or price targets.

THESIS:"""


MARKET_READ_TEMPLATE = """You are writing the daily market read for a quant equity dashboard. 2-3 sentences.

Today's snapshot: {snapshot_date}
Universe scanned: {tickers_scanned} tickers
Lane distribution: {lane_counts_json}
Sector momentum (top 3): {top_3_sectors}
Sector momentum (bottom 3): {bottom_3_sectors}

CRITICAL RULES:
- Use ONLY the numbers above. Do not invent index moves, FII flows, or news.
- Explain the regime: are stocks broadly oversold, momentum-heavy, mixed?
- Mention 1-2 sector names (use the actual names from the data).
- 2-3 sentences max. Direct prose. No bullet points.

MARKET READ:"""


def _format_mf_context(mf_context: dict[str, Any] | None) -> str:
    if not mf_context:
        return "none"
    funds_count = mf_context.get("funds_count", 0)
    names = mf_context.get("fund_short_names") or []
    if not funds_count:
        return "none"
    joined = ", ".join(names) if names else "tracked funds"
    return f"held by {funds_count} tracked MF ({joined})"


def _format_crossover(days: int | None) -> str:
    if days is None:
        return "no recent crossover"
    if days == 0:
        return "today (0)"
    return str(days)


def build_thesis_prompt(
    *,
    ticker: str,
    name: str,
    sector: str,
    sector_tag: str,
    lane: str,
    indicators: dict[str, float],
    cmp: float,
    macd_crossover_days_ago: int | None,
    pros: list[str],
    cons: list[str],
    mf_context: dict[str, Any] | None = None,
) -> str:
    """Construct the grounded thesis prompt for one stock card."""
    rsi = indicators.get("rsi")
    macd_hist = indicators.get("macd_hist")
    ema20 = indicators.get("ema20")
    pct_below = indicators.get("pct_below_52w_high")
    pct_below_display = (
        f"{round(pct_below * 100, 2)}" if isinstance(pct_below, (int, float)) else "n/a"
    )

    return THESIS_TEMPLATE.format(
        ticker=ticker,
        name=name,
        sector=sector,
        sector_tag=sector_tag,
        lane=lane,
        rsi=rsi if rsi is not None else "n/a",
        macd_hist=macd_hist if macd_hist is not None else "n/a",
        cmp=cmp,
        ema20=ema20 if ema20 is not None else "n/a",
        pct_below_52w_high=pct_below_display,
        macd_crossover_days_ago=_format_crossover(macd_crossover_days_ago),
        mf_context=_format_mf_context(mf_context),
        pros="; ".join(pros) if pros else "(none)",
        cons="; ".join(cons) if cons else "(none)",
    )


def build_market_read_prompt(
    *,
    snapshot_date: str,
    tickers_scanned: int,
    lane_counts: dict[str, int],
    top_3_sectors: list[tuple[str, float]],
    bottom_3_sectors: list[tuple[str, float]],
) -> str:
    """Construct the grounded market-read prompt."""

    def _fmt(items: list[tuple[str, float]]) -> str:
        if not items:
            return "(none)"
        return ", ".join(f"{name} ({round(m, 3)})" for name, m in items)

    return MARKET_READ_TEMPLATE.format(
        snapshot_date=snapshot_date,
        tickers_scanned=tickers_scanned,
        lane_counts_json=json.dumps(lane_counts, sort_keys=True),
        top_3_sectors=_fmt(top_3_sectors),
        bottom_3_sectors=_fmt(bottom_3_sectors),
    )
