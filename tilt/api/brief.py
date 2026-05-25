"""Compose the v3 daily-brief payload — hero pick + supporting list + market read.

The brief endpoint is the centerpiece of the v3 frame: a published research
note, not a screener grid. This module owns the composition:

1. Run the existing recommendation engine to get all lane cards.
2. Pick the highest-scored card as the hero.
3. Pick the next 4-6 cards as the supporting list (lane-diversified).
4. Ask the LLM provider for a 3-sentence thesis on the hero, a one-sentence
   thesis_short for each supporting pick, and a market-read paragraph for the
   day. The provider may be Gemini or the deterministic fallback — the brief
   shape is identical either way.

No new math. Everything routes through ``build_recommendation`` and the
existing snapshot machinery so the brief can never contradict the
``/scan/recommendations`` endpoint.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from tilt.api.recommendations import Recommendation, build_recommendation
from tilt.api.service import ScanService, UniverseSnapshot
from tilt.funds import MutualFund, load_mf_holdings, smart_money_context
from tilt.llm import (
    LLMProvider,
    build_market_read_prompt,
    build_thesis_prompt,
    get_default_provider,
)
from tilt.signals import build_snapshot

SUPPORTING_MIN = 4
SUPPORTING_MAX = 6


@dataclass(frozen=True)
class BriefPick:
    """One pick on the brief — either the hero (with full thesis) or a supporting row."""

    ticker: str
    name: str
    lane: str
    cmp: float
    score: float
    sector: str
    sector_tag: str
    indicators: dict[str, float]
    score_breakdown: dict[str, float]
    pros: list[str]
    cons: list[str]
    mf_context: dict[str, Any] | None
    thesis: str | None = None  # full 3-sentence thesis (hero only)
    thesis_short: str | None = None  # 1-sentence thesis (supporting picks)
    why_this: str | None = None  # exclusivity line (hero only)


@dataclass(frozen=True)
class Brief:
    snapshot_date: str
    generated_at: str
    market_read: str
    tickers_scanned: int
    total_picks: int
    lane_counts: dict[str, int]
    hero: BriefPick | None
    supporting: list[BriefPick]
    top_sectors: list[tuple[str, float]]
    bottom_sectors: list[tuple[str, float]]
    llm_provider: str  # "gemini" | "deterministic" | "cached"
    data_mode: str  # "snapshot" | "live"


def _recommendation_to_pick(
    rec: Recommendation,
    *,
    thesis: str | None = None,
    thesis_short: str | None = None,
    why_this: str | None = None,
) -> BriefPick:
    return BriefPick(
        ticker=rec.ticker,
        name=rec.name,
        lane=rec.lane,
        cmp=rec.cmp,
        score=rec.score,
        sector=rec.sector,
        sector_tag=rec.sector_tag,
        indicators=dict(rec.indicators),
        score_breakdown=dict(rec.score_breakdown),
        pros=list(rec.pros),
        cons=list(rec.cons),
        mf_context=dict(rec.mf_context) if rec.mf_context else None,
        thesis=thesis,
        thesis_short=thesis_short,
        why_this=why_this,
    )


def _compute_macd_crossover_days(close) -> int | None:
    snap = build_snapshot(close)
    return snap.macd_crossover_days_ago if snap else None


def _collect_recommendations(
    snapshot: UniverseSnapshot,
    funds: list[MutualFund],
) -> list[Recommendation]:
    out: list[Recommendation] = []
    for ticker, close in snapshot.closes.items():
        sector_ranking = snapshot.sector_by_ticker.get(ticker)
        if sector_ranking is None:
            continue
        mf_ctx = smart_money_context(ticker, funds)
        rec = build_recommendation(
            ticker=ticker,
            name=snapshot.name_by_ticker.get(ticker, ticker),
            close=close,
            sector=sector_ranking.display_name,
            sector_id=sector_ranking.sector_name,
            sector_tag=sector_ranking.tag,
            sector_strength=sector_ranking.momentum,
            mf_ctx=mf_ctx,
        )
        if rec is not None:
            out.append(rec)
    out.sort(key=lambda r: -r.score)
    return out


def _select_supporting(
    cards: list[Recommendation],
    hero_ticker: str,
    *,
    limit: int = SUPPORTING_MAX,
) -> list[Recommendation]:
    """Pick the next N cards, lane-diversified where possible.

    Greedy: take the highest-scored card from each lane in turn until we run
    out or hit ``limit``. Falls back to pure score ranking if lanes are thin.
    """
    pool = [c for c in cards if c.ticker != hero_ticker]
    seen_lanes: list[str] = []
    chosen: list[Recommendation] = []

    # First pass: one per lane in score order.
    for rec in pool:
        if rec.lane not in seen_lanes:
            chosen.append(rec)
            seen_lanes.append(rec.lane)
        if len(chosen) >= limit:
            break

    # Second pass: top up to limit purely by score.
    if len(chosen) < limit:
        chosen_tickers = {r.ticker for r in chosen}
        for rec in pool:
            if rec.ticker in chosen_tickers:
                continue
            chosen.append(rec)
            chosen_tickers.add(rec.ticker)
            if len(chosen) >= limit:
                break

    return chosen[:limit]


def _build_why_this(hero: Recommendation, lane_counts: dict[str, int], tickers_scanned: int) -> str:
    """One italic line explaining the exclusivity of this pick."""
    lane_label = hero.lane.replace("_", " ").title()
    same_lane = lane_counts.get(hero.lane, 0)
    if same_lane <= 1:
        return f"Of {tickers_scanned} stocks scanned, only 1 cleared the {lane_label} lane today."
    return (
        f"Of {tickers_scanned} stocks scanned, {same_lane} cleared the {lane_label} lane — "
        f"this one scored highest."
    )


def _top_bottom_sectors(
    snapshot: UniverseSnapshot,
) -> tuple[list[tuple[str, float]], list[tuple[str, float]]]:
    ranked = sorted(snapshot.rankings, key=lambda r: -r.momentum)
    top = [(r.display_name, r.momentum) for r in ranked[:3]]
    bottom = [(r.display_name, r.momentum) for r in ranked[-3:]]
    return top, bottom


def compose_brief(
    snapshot: UniverseSnapshot,
    *,
    snapshot_date: str,
    data_mode: str,
    llm_provider: LLMProvider | None = None,
    funds: list[MutualFund] | None = None,
    generated_at: str,
) -> Brief:
    """Assemble the full v3 brief payload from a fresh universe snapshot."""
    provider = llm_provider or get_default_provider()
    funds = funds if funds is not None else load_mf_holdings()

    recommendations = _collect_recommendations(snapshot, funds)
    lane_counts = {
        "strong": sum(1 for r in recommendations if r.lane == "strong"),
        "momentum": sum(1 for r in recommendations if r.lane == "momentum"),
        "value": sum(1 for r in recommendations if r.lane == "value"),
        "smart_money": sum(1 for r in recommendations if r.lane == "smart_money"),
    }
    tickers_scanned = len(snapshot.closes)
    total_picks = len(recommendations)
    top_sectors, bottom_sectors = _top_bottom_sectors(snapshot)

    hero_pick: BriefPick | None = None
    supporting_picks: list[BriefPick] = []

    if recommendations:
        hero_rec = recommendations[0]
        macd_days = _compute_macd_crossover_days(snapshot.closes[hero_rec.ticker])
        hero_prompt = build_thesis_prompt(
            ticker=hero_rec.ticker,
            name=hero_rec.name,
            sector=hero_rec.sector,
            sector_tag=hero_rec.sector_tag,
            lane=hero_rec.lane,
            indicators=hero_rec.indicators,
            cmp=hero_rec.cmp,
            macd_crossover_days_ago=macd_days,
            pros=hero_rec.pros,
            cons=hero_rec.cons,
            mf_context=hero_rec.mf_context,
        )
        hero_thesis = _call_thesis(
            provider,
            prompt=hero_prompt,
            rec=hero_rec,
            snapshot_date=snapshot_date,
            short=False,
        )
        why_this = _build_why_this(hero_rec, lane_counts, tickers_scanned)
        hero_pick = _recommendation_to_pick(
            hero_rec,
            thesis=hero_thesis,
            why_this=why_this,
        )

        supporting_recs = _select_supporting(recommendations, hero_rec.ticker, limit=SUPPORTING_MAX)
        for rec in supporting_recs:
            macd_days = _compute_macd_crossover_days(snapshot.closes[rec.ticker])
            prompt = build_thesis_prompt(
                ticker=rec.ticker,
                name=rec.name,
                sector=rec.sector,
                sector_tag=rec.sector_tag,
                lane=rec.lane,
                indicators=rec.indicators,
                cmp=rec.cmp,
                macd_crossover_days_ago=macd_days,
                pros=rec.pros,
                cons=rec.cons,
                mf_context=rec.mf_context,
            )
            thesis_short = _call_thesis(
                provider,
                prompt=prompt,
                rec=rec,
                snapshot_date=snapshot_date,
                short=True,
            )
            supporting_picks.append(_recommendation_to_pick(rec, thesis_short=thesis_short))

    market_prompt = build_market_read_prompt(
        snapshot_date=snapshot_date,
        tickers_scanned=tickers_scanned,
        lane_counts=lane_counts,
        top_3_sectors=top_sectors,
        bottom_3_sectors=bottom_sectors,
    )
    market_read = _call_market_read(
        provider,
        prompt=market_prompt,
        snapshot_date=snapshot_date,
        tickers_scanned=tickers_scanned,
        lane_counts=lane_counts,
        top_sectors=top_sectors,
        bottom_sectors=bottom_sectors,
    )

    # Surface the underlying provider name when wrapped in CachedLLMProvider.
    provider_name = getattr(provider, "inner", provider).name

    return Brief(
        snapshot_date=snapshot_date,
        generated_at=generated_at,
        market_read=market_read,
        tickers_scanned=tickers_scanned,
        total_picks=total_picks,
        lane_counts=lane_counts,
        hero=hero_pick,
        supporting=supporting_picks[:SUPPORTING_MAX],
        top_sectors=top_sectors,
        bottom_sectors=bottom_sectors,
        llm_provider=provider_name,
        data_mode=data_mode,
    )


def _call_thesis(
    provider: LLMProvider,
    *,
    prompt: str,
    rec: Recommendation,
    snapshot_date: str,
    short: bool,
) -> str:
    kwargs: dict[str, Any] = {
        "prompt": prompt,
        "ticker": rec.ticker,
        "name": rec.name,
        "pros": list(rec.pros),
        "cons": list(rec.cons),
        "mf_context": rec.mf_context,
        "short": short,
    }
    # CachedLLMProvider accepts an extra snapshot_date kw; raw providers ignore it.
    try:
        return provider.generate_thesis(snapshot_date=snapshot_date, **kwargs)  # type: ignore[call-arg]
    except TypeError:
        return provider.generate_thesis(**kwargs)


def _call_market_read(
    provider: LLMProvider,
    *,
    prompt: str,
    snapshot_date: str,
    tickers_scanned: int,
    lane_counts: dict[str, int],
    top_sectors: list[tuple[str, float]],
    bottom_sectors: list[tuple[str, float]],
) -> str:
    return provider.generate_market_read(
        prompt=prompt,
        snapshot_date=snapshot_date,
        tickers_scanned=tickers_scanned,
        lane_counts=lane_counts,
        top_3_sectors=top_sectors,
        bottom_3_sectors=bottom_sectors,
    )


# Helper for the route layer: produce a Brief from a ScanService.
def build_brief_from_service(
    service: ScanService,
    *,
    llm_provider: LLMProvider | None = None,
    funds: list[MutualFund] | None = None,
    generated_at: str,
) -> Brief:
    from datetime import date as _date

    from tilt.data import SnapshotProvider

    snapshot, _ = service.refresh()

    snapshot_date_str = _date.today().isoformat()
    data_mode = "live"
    for provider in service.fetcher.providers:
        if isinstance(provider, SnapshotProvider):
            try:
                snapshot_date_str = provider.snapshot_date.isoformat()
                data_mode = "snapshot"
            except Exception:
                pass
            break

    return compose_brief(
        snapshot,
        snapshot_date=snapshot_date_str,
        data_mode=data_mode,
        llm_provider=llm_provider,
        funds=funds,
        generated_at=generated_at,
    )
