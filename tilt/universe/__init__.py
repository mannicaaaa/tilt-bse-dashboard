"""Universe + sectoral index membership loaders.

Static reference data — ticker lists for the Nifty 500 (starter subset) and
all 14 sectoral indices Tilt tracks. Shipped as JSON inside the package rather
than fetched from NSE at runtime: hermetic, deterministic, no cookie-gated
HTTP dance during demos. The trade is staleness — the lists snapshot the
constituent picture at build time and don't auto-rebalance.

Disclosed in the README and in ``loaders.get_nifty500``'s docstring so it's a
talking point, not a hidden limitation.
"""

from __future__ import annotations

from tilt.universe.loaders import (
    SECTOR_DISPLAY_NAMES,
    SECTOR_NAMES,
    StockInfo,
    UnknownSectorError,
    get_all_sectors,
    get_mf_extras,
    get_nifty500,
    get_sector,
    get_universe,
)

__all__ = [
    "SECTOR_DISPLAY_NAMES",
    "SECTOR_NAMES",
    "StockInfo",
    "UnknownSectorError",
    "get_all_sectors",
    "get_mf_extras",
    "get_nifty500",
    "get_sector",
    "get_universe",
]
