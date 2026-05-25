"""Grounded prompt templates for the LLM narrative layer.

Every template explicitly tells the model: use ONLY the values provided. The
model paraphrases — it does not synthesize fresh facts. This is the
hallucination-defense the demo storyboard rests on.
"""

from __future__ import annotations

import json
from typing import Any

THESIS_TEMPLATE = """You are writing for a retail Indian investor who has NEVER taken a finance class.
Your job: explain in 2-3 sentences why this stock might be a good buy today, using plain English.

Stock: {ticker} ({name})
Sector: {sector} ({sector_tag})
Lane category: {lane}

The numbers you can use (these are the ONLY facts you may cite):
  Buying pressure score (RSI): {rsi} out of 100  (above 70 = overheated, below 30 = beaten down, 40-60 = healthy)
  Momentum score (MACD histogram): {macd_hist}  (positive = trend turning up)
  Today's price: Rs.{cmp}
  Recent 20-day average price: Rs.{ema20}
  How much below the 52-week peak: {pct_below_52w_high}%
  Days since momentum turned positive: {macd_crossover_days_ago}
Mutual fund context: {mf_context}

What's good about this stock today: {pros}
What to watch out for: {cons}

CRITICAL RULES — read carefully:
- Use ONLY the values above. NEVER invent prices, percentages, or facts.
- Write like you're texting a friend who doesn't know stocks. NO jargon like "MACD", "RSI", "EMA20", "52w gap", "histogram", "rally band". Translate them.
  - Instead of "MACD turned positive" → "momentum just shifted upward"
  - Instead of "RSI 56" → "buying pressure is balanced, room to run"
  - Instead of "EMA20" → "20-day average price"
  - Instead of "12% below 52-week high" → "12% cheaper than its yearly peak"
- 2-3 sentences total. Direct. Confident. No "may", "could", "potentially" hedging.
- If a fund holds it, mention that — "Top funds like X are already holding it" adds trust.
- Do not output disclaimers, "consult a financial advisor", ratings, or price targets.

PLAIN-ENGLISH THESIS:"""


MARKET_READ_TEMPLATE = """You are writing the daily market summary for a retail investor who doesn't follow markets daily. 2-3 sentences.

Today's snapshot: {snapshot_date}
Stocks scanned: {tickers_scanned}
Pick distribution by category: {lane_counts_json}
Sectors with strongest momentum (top 3): {top_3_sectors}
Sectors that are weakest (bottom 3): {bottom_3_sectors}

CRITICAL RULES:
- Use ONLY the numbers above. NEVER invent index moves, news, FII flows, or events.
- Write like you're texting a friend who isn't a trader. NO jargon — say "stocks selling off heavily" not "broadly oversold". Say "moving up fast" not "momentum-heavy".
- Explain the regime in plain words: are most stocks beaten down? Running hot? Mixed?
- Name 1-2 sectors using the names provided.
- 2-3 sentences max. Direct prose. No bullet points or disclaimers.

PLAIN-ENGLISH MARKET READ:"""


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
