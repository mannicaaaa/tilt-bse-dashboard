"""CSV loader for the mutual-fund-holdings snapshot.

CSV format: two-column ``MF,stock`` with the MF column **forward-filled**
(blank rows inherit the most-recent fund name). Stock names come from AMC
factsheets and are messy — trailing punctuation, casing inconsistency,
occasional typos. We normalize aggressively and map to NSE tickers via a
hand-curated dictionary.

Stocks we can't confidently map are **skipped with a warning** — no
fabricated tickers reach the universe. The warning lists what was dropped
so the next manual refresh can extend the mapping.
"""

from __future__ import annotations

import csv
import logging
import re
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger(__name__)

DEFAULT_MF_CSV_PATH = Path("data/mutual_fund_holdings.csv")


# Hand-curated name → NSE-ticker mapping. Keys are normalized stock names
# (lowercased, punctuation/whitespace cleaned). Add entries when monthly
# refresh surfaces a new holding.
_NAME_TO_TICKER: dict[str, str] = {
    # ✓ Tickers already in Tilt's curated Nifty 500 starter universe
    "bharti airtel ltd": "BHARTIARTL",
    "eicher motors ltd": "EICHERMOT",
    "divis laboratories ltd": "DIVISLAB",
    "divi s laboratories ltd": "DIVISLAB",
    "sun pharmaceutical industries ltd": "SUNPHARMA",
    "lupin ltd": "LUPIN",
    "the federal bank ltd": "FEDERALBNK",
    "indusind bank ltd": "INDUSINDBK",
    # Newly added (will be appended to the universe loader)
    "central depository services india ltd": "CDSL",
    "bse ltd": "BSE",
    "multi commodity exchange of india ltd": "MCX",
    "hdfc asset management company ltd": "HDFCAMC",
    "360 one wam ltd": "360ONE",
    "angel one ltd": "ANGELONE",
    "au small finance bank ltd": "AUBANK",
    "pb fintech ltd": "POLICYBZR",
    "max financial services ltd": "MFSL",
    "bharat heavy electricals ltd": "BHEL",
    "naveen fluorine international ltd": "NAVINFLUOR",
    "karur vysya bank ltd": "KARURVYSYA",
    "fsn e commerce ventures ltd": "NYKAA",
    "glenmark pharmaceuticals ltd": "GLENMARK",
    "glenmark pharmacuticles ltd": "GLENMARK",  # CSV typo
}

# Stocks we deliberately drop until we can confirm tickers (renames,
# ambiguous corporate identities, fresh IPOs). Listed here so the warning
# logs are not noisy — we know about these and chose to skip.
_KNOWN_UNMAPPABLE: set[str] = {
    "nippon life india asset management ltd",
    "ge vernova t d india ltd",
    "ge varnova t d india ltd",  # CSV typo for "Vernova"
    "hitachi energy india ltd",
    "billion brains garage ventures ltd",
    "piramal finance ltd",
}


@dataclass(frozen=True)
class MutualFund:
    """One mutual fund and its currently-disclosed holdings.

    ``aum_cr`` and ``last_filing`` are placeholders because the source CSV
    doesn't carry them; production upgrade path adds these from factsheet
    metadata.
    """

    name: str
    holdings: list[str]  # NSE tickers
    aum_cr: float = 0.0
    last_filing: str = ""

    @property
    def short_name(self) -> str:
        """Trim the trailing 'Fund Direct Growth' etc. for compact display."""
        s = self.name
        for suffix in (
            " Fund Direct Growth",
            " Direct Growth",
            " Fund",
            " Index Fund",
        ):
            if s.endswith(suffix):
                s = s[: -len(suffix)]
        return s.strip()


def _normalize_stock_name(raw: str) -> str:
    """Lowercase, strip punctuation + extra whitespace for dictionary lookup."""
    s = raw.lower().strip()
    s = re.sub(r"[\.,'/\-_&\(\)]+", " ", s)  # punctuation → space
    s = re.sub(r"\s+", " ", s).strip()
    return s


def _resolve_ticker(stock_name: str) -> str | None:
    """Return NSE ticker for a stock name, or None if not mappable."""
    norm = _normalize_stock_name(stock_name)
    return _NAME_TO_TICKER.get(norm)


def load_mf_holdings(csv_path: Path | str | None = None) -> list[MutualFund]:
    """Load MF holdings from CSV with forward-fill on the MF column.

    Skips rows where the stock name can't be resolved to a ticker. Logs a
    one-line warning summary of dropped stocks at the end (not per-row, to
    keep startup logs quiet on the monthly-refresh workflow).
    """
    path = Path(csv_path) if csv_path else DEFAULT_MF_CSV_PATH
    if not path.exists():
        log.warning("MF holdings CSV not found at %s — Smart Money lane disabled", path)
        return []

    funds_by_name: dict[str, list[str]] = {}
    order: list[str] = []  # preserve fund order from CSV
    current_fund: str | None = None
    unmapped: list[str] = []

    with path.open(newline="") as f:
        reader = csv.reader(f)
        next(reader, None)  # header
        for row in reader:
            if not row or all(not c.strip() for c in row):
                continue
            fund_cell = row[0].strip()
            stock_cell = row[1].strip() if len(row) > 1 else ""
            if fund_cell:
                current_fund = fund_cell
                if current_fund not in funds_by_name:
                    funds_by_name[current_fund] = []
                    order.append(current_fund)
            if not stock_cell or current_fund is None:
                continue
            ticker = _resolve_ticker(stock_cell)
            if ticker is None:
                norm = _normalize_stock_name(stock_cell)
                if norm not in _KNOWN_UNMAPPABLE:
                    unmapped.append(stock_cell)
                continue
            holdings = funds_by_name[current_fund]
            if ticker not in holdings:  # dedupe within a fund
                holdings.append(ticker)

    if unmapped:
        log.warning(
            "MF loader: %d stock names not in name→ticker dict (add to tilt/funds/loader.py): %s",
            len(unmapped),
            ", ".join(sorted(set(unmapped))),
        )

    return [MutualFund(name=name, holdings=funds_by_name[name]) for name in order]
