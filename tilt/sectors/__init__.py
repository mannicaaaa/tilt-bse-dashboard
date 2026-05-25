"""Sector rotation overlay.

Ranks the 14 sectoral indices by momentum and tags each Hot / Neutral / Cold.
The signal engine consumes the per-sector momentum value as the ``sector``
component of its composite score, and the API layer surfaces the ranked
heatmap directly at ``/sectors/heatmap``.

Implementation choice (documented in ``rotation.compute_sector_momentum``):
we compute sector momentum as the **average of the constituent stocks'**
momentum scores rather than fetching the sectoral index's OHLCV separately.
That sidesteps the need to handle ``^NSEBANK``-style index tickers in our
provider chain and reuses the same machinery the signal engine already runs.
"""

from __future__ import annotations

from tilt.sectors.rotation import (
    COLD_TAG,
    HOT_TAG,
    NEUTRAL_TAG,
    SectorRanking,
    compute_sector_momentum,
    rank_sectors,
)

__all__ = [
    "COLD_TAG",
    "HOT_TAG",
    "NEUTRAL_TAG",
    "SectorRanking",
    "compute_sector_momentum",
    "rank_sectors",
]
