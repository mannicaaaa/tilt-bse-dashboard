"""3-lane recommendation builder — Strong / Momentum / Value.

Output shape feeds the Today's-Picks screen of the v2 frontend. Each
recommendation card carries human-readable pros + cons derived directly from
the indicator snapshot — pros are filter conditions that *fired*, cons are
sector context plus conditions that didn't. No LLM in the loop; the math
generates the language.

Lane definitions (locked, surface as plain-English in the UI):

- **strong**   — Passes all 4 strict Rally conditions. The clean entry.
- **momentum** — MACD histogram positive + above EMA20 + RSI ≥ 50.
                 Already moving; later but still a valid entry.
- **value**    — RSI < 35 + ≥ 10% below 52-week high.
                 Oversold contrarian bet, longer hold horizon.

A stock can only land in **one** lane — strong wins over momentum wins over
value. This keeps the Today's-Picks screen clear: each card sits in exactly
one column.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from tilt.signals import (
    RALLY_MACD_CROSSOVER_WINDOW,
    RALLY_MIN_52W_GAP,
    RALLY_RSI_HIGH,
    RALLY_RSI_LOW,
    IndicatorSnapshot,
    build_snapshot,
)

# Momentum-lane thresholds (looser than Rally — surfaces stocks already moving).
MOMENTUM_RSI_MIN = 50.0

# Value-lane thresholds.
VALUE_RSI_MAX = 35.0
VALUE_MIN_52W_GAP = 0.10


@dataclass(frozen=True)
class Recommendation:
    ticker: str
    name: str
    cmp: float
    score: float
    lane: str  # 'strong' | 'momentum' | 'value'
    sector: str
    sector_id: str
    sector_tag: str
    indicators: dict[str, float]
    score_breakdown: dict[str, float]
    pros: list[str]
    cons: list[str]


def assign_lane(snap: IndicatorSnapshot, cmp: float) -> str | None:
    """Return the lane a stock belongs in, or None if it qualifies for none.

    Strong > Momentum > Value (single-lane assignment).
    """
    # Strong: all 4 Rally conditions
    if (
        snap.macd_crossover_days_ago is not None
        and snap.macd_crossover_days_ago <= RALLY_MACD_CROSSOVER_WINDOW
        and cmp > snap.ema20
        and RALLY_RSI_LOW <= snap.rsi <= RALLY_RSI_HIGH
        and snap.pct_below_52w_high >= RALLY_MIN_52W_GAP
    ):
        return "strong"

    # Momentum: positive hist + above EMA20 + RSI rising
    if snap.macd_hist > 0 and cmp > snap.ema20 and snap.rsi >= MOMENTUM_RSI_MIN:
        return "momentum"

    # Value: oversold + value gap intact
    if snap.rsi < VALUE_RSI_MAX and snap.pct_below_52w_high >= VALUE_MIN_52W_GAP:
        return "value"

    return None


def derive_pros(snap: IndicatorSnapshot, cmp: float, lane: str) -> list[str]:
    """Generate human-readable pros from the indicator snapshot."""
    pros: list[str] = []

    if (
        snap.macd_crossover_days_ago is not None
        and snap.macd_crossover_days_ago <= RALLY_MACD_CROSSOVER_WINDOW
    ):
        days = snap.macd_crossover_days_ago
        pros.append(
            f"MACD turned positive {'today' if days == 0 else f'{days} day{"s" if days != 1 else ""} ago'}"
        )
    elif snap.macd_hist > 0:
        pros.append(f"MACD histogram positive ({snap.macd_hist:.2f})")

    if cmp > snap.ema20:
        pct_above = (cmp / snap.ema20 - 1.0) * 100.0
        pros.append(f"Trading {pct_above:.1f}% above 20-day moving average")

    if lane == "strong" and RALLY_RSI_LOW <= snap.rsi <= RALLY_RSI_HIGH:
        pros.append(f"RSI {snap.rsi:.0f} — inside entry sweet spot")
    elif lane == "value" and snap.rsi < VALUE_RSI_MAX:
        pros.append(f"RSI {snap.rsi:.0f} — clearly oversold")
    elif lane == "momentum" and snap.rsi >= MOMENTUM_RSI_MIN:
        pros.append(f"RSI {snap.rsi:.0f} — strong upside momentum")

    if snap.pct_below_52w_high >= RALLY_MIN_52W_GAP:
        pct = snap.pct_below_52w_high * 100.0
        pros.append(f"{pct:.1f}% below 52-week high — value gap intact")
    elif snap.pct_below_52w_high >= VALUE_MIN_52W_GAP:
        pct = snap.pct_below_52w_high * 100.0
        pros.append(f"{pct:.1f}% below 52-week high — discount available")

    if lane == "value" and snap.macd_hist_rising:
        pros.append("MACD histogram turning up — bottom may be in")

    return pros[:4]  # cap at 4 pros for card readability


def derive_cons(snap: IndicatorSnapshot, cmp: float, sector_tag: str, lane: str) -> list[str]:
    """Generate human-readable cons — sector context + risk conditions."""
    cons: list[str] = []

    if sector_tag == "Cold":
        cons.append("Sector momentum is Cold — limited tailwind")
    elif sector_tag == "Neutral":
        cons.append("Sector momentum is Neutral — no strong tailwind")

    if lane == "value":
        # Value picks tend to have weaker technicals
        if snap.macd_hist < 0:
            cons.append(f"MACD still negative ({snap.macd_hist:.2f}) — no reversal yet")
        if cmp < snap.ema20:
            pct_below = (1.0 - cmp / snap.ema20) * 100.0
            cons.append(f"{pct_below:.1f}% below 20-day average — trend not turned")
    elif lane == "momentum":
        if snap.rsi > 70:
            cons.append(f"RSI {snap.rsi:.0f} — approaching overbought; entry is later")
        if snap.pct_below_52w_high < 0.05:
            pct = snap.pct_below_52w_high * 100.0
            cons.append(f"Only {pct:.1f}% below 52w high — limited upside cushion")
    elif lane == "strong":
        # Strong lane is by definition clean; cons are subtle
        if snap.pct_below_52w_high > 0.25:
            cons.append("Far from 52w high — may signal extended weakness")

    return cons[:3]  # cap at 3 cons


def build_recommendation(
    ticker: str,
    name: str,
    close: pd.Series,
    sector: str,
    sector_id: str,
    sector_tag: str,
    sector_strength: float,
) -> Recommendation | None:
    """Compute snapshot, assign lane, derive pros/cons. None if no lane fits."""
    from tilt.signals.score import build_score

    snap = build_snapshot(close)
    cmp = float(close.iloc[-1])
    lane = assign_lane(snap, cmp)
    if lane is None:
        return None

    breakdown = build_score(snap, cmp, sector_strength)
    return Recommendation(
        ticker=ticker,
        name=name,
        cmp=cmp,
        score=breakdown.total,
        lane=lane,
        sector=sector,
        sector_id=sector_id,
        sector_tag=sector_tag,
        indicators={
            "rsi": round(snap.rsi, 2),
            "macd": round(snap.macd, 4),
            "macd_hist": round(snap.macd_hist, 4),
            "ema20": round(snap.ema20, 2),
            "pct_below_52w_high": round(snap.pct_below_52w_high, 4),
        },
        score_breakdown={
            "momentum": round(breakdown.momentum, 4),
            "upside": round(breakdown.upside, 4),
            "rsi": round(breakdown.rsi, 4),
            "sector": round(breakdown.sector, 4),
        },
        pros=derive_pros(snap, cmp, lane),
        cons=derive_cons(snap, cmp, sector_tag, lane),
    )
