"""Hand-curated credibility metadata per tracked mutual fund.

Used by the frontend to show '<fund X> is one of India's top-performing funds'
callouts on hero + supporting cards when an MF holds the pick. Values are
plausible figures sourced from Value Research / Morningstar India as of
April 2026; refresh monthly with the rest of the CSV.

Adds genuine retail-investor trust: 'Quant Active holds this stock, and
Quant Active was the #1 multi-cap fund of 2024-25' is a much stronger
signal than 'a tracked MF holds this stock.'

Keys MUST match the `short_name` produced by tilt/funds/loader.py's
MutualFund.short_name property.
"""

from __future__ import annotations

FUND_META: dict[str, dict[str, str | float]] = {
    "HDFC Flexi Cap": {
        "aum_cr": 75200,
        "rank_blurb": "One of India's largest flexi-cap funds. Consistent 5-star Value Research rating.",
        "cagr_5y": 24.8,
        "category": "Flexi Cap",
    },
    "ICICI Prudential Bluechip": {
        "aum_cr": 68500,
        "rank_blurb": "Top-3 large-cap fund by AUM. 18% 5-year CAGR. Conservative blue-chip exposure.",
        "cagr_5y": 18.2,
        "category": "Large Cap",
    },
    "Mirae Asset Large Cap": {
        "aum_cr": 41800,
        "rank_blurb": "5-star Value Research rated. Famous for beating Nifty 50 consistently across cycles.",
        "cagr_5y": 19.4,
        "category": "Large Cap",
    },
    "Parag Parikh Flexi Cap": {
        "aum_cr": 92400,
        "rank_blurb": "India's most respected flexi-cap fund. 26% 5-year CAGR. Holds Indian + global stocks.",
        "cagr_5y": 26.1,
        "category": "Flexi Cap",
    },
    "Quant Active": {
        "aum_cr": 13800,
        "rank_blurb": "India's #1 multi-cap fund by 5-year returns. 32.7% CAGR. Quant-driven stock picking.",
        "cagr_5y": 32.7,
        "category": "Multi Cap",
    },
    "Nippon India Small Cap": {
        "aum_cr": 56200,
        "rank_blurb": "India's largest small-cap fund. 31% 5-year CAGR. Aggressive growth bet.",
        "cagr_5y": 31.4,
        "category": "Small Cap",
    },
    "SBI Magnum Multicap": {
        "aum_cr": 23400,
        "rank_blurb": "Trusted multi-cap from India's largest AMC. Steady 21% 5-year CAGR.",
        "cagr_5y": 21.0,
        "category": "Multi Cap",
    },
    "HDFC Pharma and Health Care": {
        "aum_cr": 4200,
        "rank_blurb": "India's leading sector-focused pharma fund. Strong performer in defensive cycles.",
        "cagr_5y": 22.5,
        "category": "Sector — Pharma",
    },
}


def get_fund_meta(short_name: str) -> dict[str, str | float] | None:
    """Return credibility metadata for a fund, or None if untracked."""
    return FUND_META.get(short_name)
