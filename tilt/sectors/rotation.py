"""Sector momentum ranking and Hot/Neutral/Cold tagging."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean

import pandas as pd

from tilt.signals.engine import build_snapshot
from tilt.signals.score import momentum_score
from tilt.universe import SECTOR_DISPLAY_NAMES

HOT_TAG = "Hot"
NEUTRAL_TAG = "Neutral"
COLD_TAG = "Cold"


@dataclass(frozen=True)
class SectorRanking:
    """One row in the sector heatmap."""

    sector_name: str  # snake_case
    display_name: str
    momentum: float  # [0, 1] — average momentum of constituents
    rank: int  # 1 = strongest sector
    tag: str  # Hot / Neutral / Cold


def compute_sector_momentum(constituent_closes: dict[str, pd.Series]) -> float:
    """Average ``momentum_score`` across the sector's available constituent closes.

    Returns 0.0 if no constituent data is available (sector silently treated
    as Cold). Constituents for which the snapshot can't be built — extremely
    short series — are dropped, not zeroed; we don't want missing data to
    spuriously drag the sector down.
    """
    scores: list[float] = []
    for close in constituent_closes.values():
        if len(close.dropna()) < 30:  # not enough bars to compute meaningful momentum
            continue
        snap = build_snapshot(close)
        if snap is None:
            continue
        cmp = float(close.dropna().iloc[-1])
        scores.append(momentum_score(snap, cmp))
    return mean(scores) if scores else 0.0


def rank_sectors(sector_momentums: dict[str, float]) -> list[SectorRanking]:
    """Rank sectors by momentum descending; tag top-4 Hot, bottom-4 Cold (for n=14).

    For other ``n``, splits roughly into thirds with at least one sector in
    Hot and Cold each.
    """
    if not sector_momentums:
        return []

    sorted_items = sorted(sector_momentums.items(), key=lambda kv: -kv[1])
    n = len(sorted_items)

    if n == 14:
        hot_count, cold_count = 4, 4
    else:
        hot_count = max(1, n // 3)
        cold_count = max(1, n // 3)

    rankings: list[SectorRanking] = []
    for i, (sector, momentum) in enumerate(sorted_items):
        if i < hot_count:
            tag = HOT_TAG
        elif i >= n - cold_count:
            tag = COLD_TAG
        else:
            tag = NEUTRAL_TAG
        rankings.append(
            SectorRanking(
                sector_name=sector,
                display_name=SECTOR_DISPLAY_NAMES.get(sector, sector),
                momentum=momentum,
                rank=i + 1,
                tag=tag,
            )
        )
    return rankings
