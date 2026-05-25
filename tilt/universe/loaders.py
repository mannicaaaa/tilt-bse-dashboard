"""Loader functions for the Nifty 500 + 14 sectoral indices.

Data files live next to this module under ``data/``. All readers go through
``_load_json`` so the on-disk schema is enforced in exactly one place.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

_DATA_DIR = Path(__file__).parent / "data"
_SECTORS_DIR = _DATA_DIR / "sectors"


SECTOR_NAMES: tuple[str, ...] = (
    "nifty_bank",
    "nifty_private_bank",
    "nifty_psu_bank",
    "nifty_financial_services",
    "nifty_it",
    "nifty_pharma",
    "nifty_healthcare",
    "nifty_auto",
    "nifty_fmcg",
    "nifty_consumer_durables",
    "nifty_metal",
    "nifty_energy",
    "nifty_oil_gas",
    "nifty_realty",
)


SECTOR_DISPLAY_NAMES: dict[str, str] = {
    "nifty_bank": "Nifty Bank",
    "nifty_private_bank": "Nifty Private Bank",
    "nifty_psu_bank": "Nifty PSU Bank",
    "nifty_financial_services": "Nifty Financial Services",
    "nifty_it": "Nifty IT",
    "nifty_pharma": "Nifty Pharma",
    "nifty_healthcare": "Nifty Healthcare",
    "nifty_auto": "Nifty Auto",
    "nifty_fmcg": "Nifty FMCG",
    "nifty_consumer_durables": "Nifty Consumer Durables",
    "nifty_metal": "Nifty Metal",
    "nifty_energy": "Nifty Energy",
    "nifty_oil_gas": "Nifty Oil & Gas",
    "nifty_realty": "Nifty Realty",
}


@dataclass(frozen=True)
class StockInfo:
    ticker: str
    name: str


class UnknownSectorError(KeyError):
    """Raised when ``get_sector`` is called with an unknown sector name."""


def _load_json(path: Path) -> list[StockInfo]:
    if not path.exists():
        raise FileNotFoundError(f"Universe data file not found: {path}")
    with path.open() as f:
        raw = json.load(f)
    return [StockInfo(ticker=item["ticker"], name=item["name"]) for item in raw]


def get_nifty500() -> list[StockInfo]:
    """Return the Nifty 500 constituent list — *starter subset* for the demo.

    This is a hand-curated representative subset of the Nifty 500 (the largest
    and most liquid names), not the full 500. Production would fetch the
    official constituent CSV from NSE's index page and refresh it on each
    quarterly rebalance. Limitation disclosed in the README.
    """
    return _load_json(_DATA_DIR / "nifty500.json")


def get_sector(name: str) -> list[StockInfo]:
    """Return constituents of a single sectoral index by snake_case ``name``.

    Raises ``UnknownSectorError`` if ``name`` is not in ``SECTOR_NAMES``.
    """
    if name not in SECTOR_NAMES:
        raise UnknownSectorError(f"Unknown sector {name!r}. Known sectors: {SECTOR_NAMES}")
    return _load_json(_SECTORS_DIR / f"{name}.json")


def get_all_sectors() -> dict[str, list[StockInfo]]:
    """Return ``{sector_name: [StockInfo, ...]}`` for all 14 sectoral indices."""
    return {name: get_sector(name) for name in SECTOR_NAMES}


def get_universe() -> list[StockInfo]:
    """Return the union of Nifty 500 + every sectoral constituent, dedup by ticker.

    Some sectoral indices contain names outside the Nifty 500 (smaller banks,
    PSUs, etc), so this union is strictly larger than ``get_nifty500()``. First
    occurrence of a ticker wins for the ``name`` field, so the Nifty 500 file's
    canonical names take precedence over sector-file copies.
    """
    seen: dict[str, StockInfo] = {}
    for stock in get_nifty500():
        seen.setdefault(stock.ticker, stock)
    for sector_stocks in get_all_sectors().values():
        for stock in sector_stocks:
            seen.setdefault(stock.ticker, stock)
    return list(seen.values())
