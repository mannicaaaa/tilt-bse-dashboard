"""Smart-money signal derivation from MF holdings.

For each ticker, compute:
- How many tracked funds hold it
- Which funds (short names, for the UI badge)
- Total AUM exposure (₹ crore) — when available

A stock counts for the Smart Money lane if **≥ 1** tracked fund holds it.
Why 1, not 2: our CSV is a small curated set of 7 funds covering specialized
mandates (Capital Markets, Mid-Small Fin Services, Pharma, etc.) — coverage
overlap between funds is structurally low. Holding by even one specialized
fund is meaningful conviction. The technical filter does the second-pass
quality check.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from tilt.funds.loader import MutualFund


@dataclass(frozen=True)
class MFContext:
    funds_count: int
    fund_short_names: list[str] = field(default_factory=list)
    smart_money_cr: float = 0.0  # 0 when AUM unavailable


def smart_money_context(ticker: str, funds: list[MutualFund]) -> MFContext | None:
    """Return MFContext if ``ticker`` is held by any tracked fund, else None."""
    holding_funds = [f for f in funds if ticker in f.holdings]
    if not holding_funds:
        return None
    return MFContext(
        funds_count=len(holding_funds),
        fund_short_names=[f.short_name for f in holding_funds],
        smart_money_cr=sum(f.aum_cr for f in holding_funds),
    )


def mf_universe(funds: list[MutualFund]) -> set[str]:
    """Union of all tickers held by ≥ 1 fund."""
    out: set[str] = set()
    for f in funds:
        out.update(f.holdings)
    return out
