"""Return + SIP projections from snapshot OHLCV.

Two retail-investor questions every stock detail screen should answer:

1. *"If I invest Rs.X today, what would it be worth in 1 month / 3 months /
   1 year / 3 years based on this stock's history?"* — `lump_sum_projection`
2. *"If I start a Rs.X/month SIP today, what would it be worth in 1 year /
   3 years / 5 years?"* — `sip_projection`

Both use ANNUALIZED historical CAGR computed from the snapshot. We assume
the future return equals the trailing historical return — a strong assumption,
disclosed in the response with a `disclaimer` field.

Reality check: the snapshot only has ~14 months of data, so the "5-year
projection" extrapolates a 1-year CAGR forward 5 years. That's deliberately
shown in the UI as "projection if recent trend continues" — not a forecast.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

import pandas as pd

TRADING_DAYS_PER_YEAR = 252


@dataclass(frozen=True)
class HorizonReturn:
    label: str  # "1M" | "3M" | "1Y" | "3Y" | "5Y"
    horizon_days: int  # calendar days forward
    cagr_used: float  # annualized rate used for this projection (decimal, e.g. 0.18)
    projected_value: float


@dataclass(frozen=True)
class StockProjections:
    ticker: str
    cmp: float
    snapshot_date: str
    trailing_cagr: float  # annualized return based on full history
    trailing_period_label: str  # e.g. "1Y", "9M" — clarifies the basis
    lump_sum_horizons: list[HorizonReturn]
    sip_horizons: list[HorizonReturn]
    disclaimer: str


def _annualized_cagr(close: pd.Series) -> tuple[float, str]:
    """Return (CAGR as decimal, human label like '1Y') for the full series."""
    valid = close.dropna()
    if len(valid) < 30:
        return 0.0, "insufficient data"
    first = float(valid.iloc[0])
    last = float(valid.iloc[-1])
    if first <= 0:
        return 0.0, "insufficient data"
    days = (valid.index[-1] - valid.index[0]).days
    if days <= 0:
        return 0.0, "insufficient data"
    years = days / 365.25
    cagr = (last / first) ** (1.0 / years) - 1.0
    if years >= 4.5:
        label = "5Y"
    elif years >= 2.5:
        label = "3Y"
    elif years >= 0.9:
        label = "1Y"
    else:
        label = f"{round(years * 12)}M"
    return cagr, label


def lump_sum_projection(
    cmp: float,
    cagr: float,
    investment: float,
    horizons_days: list[tuple[str, int]],
) -> list[HorizonReturn]:
    """Project lump-sum future value across multiple horizons.

    Uses the same trailing CAGR for every horizon — the simplest possible
    forward model. Production would use horizon-specific rates (e.g., 6mo
    momentum for 6mo projection).
    """
    out: list[HorizonReturn] = []
    for label, days in horizons_days:
        years = days / 365.25
        multiplier = (1.0 + cagr) ** years
        out.append(
            HorizonReturn(
                label=label,
                horizon_days=days,
                cagr_used=cagr,
                projected_value=investment * multiplier,
            )
        )
    return out


def sip_projection(
    monthly_amount: float,
    cagr: float,
    horizons_months: list[tuple[str, int]],
) -> list[HorizonReturn]:
    """Project SIP future value using the standard SIP-FV formula.

    FV = P * [((1 + r)^n - 1) / r] * (1 + r)
    where P = monthly investment, r = monthly return, n = months.
    """
    monthly_rate = (1.0 + cagr) ** (1.0 / 12) - 1.0
    out: list[HorizonReturn] = []
    for label, months in horizons_months:
        if monthly_rate == 0:
            fv = monthly_amount * months
        else:
            fv = monthly_amount * (((1.0 + monthly_rate) ** months - 1.0) / monthly_rate) * (
                1.0 + monthly_rate
            )
        out.append(
            HorizonReturn(
                label=label,
                horizon_days=months * 30,
                cagr_used=cagr,
                projected_value=fv,
            )
        )
    return out


# Default horizons used by the API. Frontend can pass custom values.
DEFAULT_LUMP_SUM_HORIZONS: list[tuple[str, int]] = [
    ("1M", 30),
    ("3M", 90),
    ("1Y", 365),
    ("3Y", 365 * 3),
    ("5Y", 365 * 5),
]

DEFAULT_SIP_HORIZONS: list[tuple[str, int]] = [
    ("1Y", 12),
    ("3Y", 36),
    ("5Y", 60),
]


# Reasonable bounds for the projection rate. Trailing CAGR can swing wildly
# on a small snapshot (single bad year -> -40%, single great year -> +80%);
# both look misleading to a retail viewer. We clamp to a band that:
# - Floors at +8% so projections stay aspirational (close to long-run
#   Nifty 50 CAGR); if you don't believe a stock can match that you
#   shouldn't be buying it.
# - Caps at +30% so we don't promise outlier returns.
# The actual trailing_cagr is still surfaced in the response so the user
# can see we're not hiding the underlying number.
PROJECTION_CAGR_FLOOR = 0.08
PROJECTION_CAGR_CEILING = 0.30


def _clamp_cagr_for_projection(cagr: float) -> float:
    """Clamp the raw trailing CAGR to a defensible projection rate."""
    if cagr < PROJECTION_CAGR_FLOOR:
        return PROJECTION_CAGR_FLOOR
    if cagr > PROJECTION_CAGR_CEILING:
        return PROJECTION_CAGR_CEILING
    return cagr


def compute_stock_projections(
    ticker: str,
    close: pd.Series,
    snapshot_date: str,
    *,
    lump_sum_investment: float = 30000.0,
    sip_monthly: float = 5000.0,
) -> StockProjections:
    """Compose full projection bundle for a single stock."""
    cmp = float(close.dropna().iloc[-1])
    trailing_cagr, period_label = _annualized_cagr(close)
    projection_cagr = _clamp_cagr_for_projection(trailing_cagr)

    if trailing_cagr < PROJECTION_CAGR_FLOOR:
        rate_note = (
            f"Trailing {period_label} return was {trailing_cagr * 100:.1f}% "
            f"(below the {int(PROJECTION_CAGR_FLOOR * 100)}% floor). "
            "Projection uses long-run market baseline instead."
        )
    elif trailing_cagr > PROJECTION_CAGR_CEILING:
        rate_note = (
            f"Trailing {period_label} return was {trailing_cagr * 100:.1f}% "
            f"(capped at {int(PROJECTION_CAGR_CEILING * 100)}% for projection). "
            "Outlier rates rarely persist."
        )
    else:
        rate_note = f"Projection rate: {projection_cagr * 100:.1f}% per year (matches the stock's trailing {period_label} return)."

    return StockProjections(
        ticker=ticker,
        cmp=cmp,
        snapshot_date=snapshot_date,
        trailing_cagr=trailing_cagr,
        trailing_period_label=period_label,
        lump_sum_horizons=lump_sum_projection(
            cmp=cmp,
            cagr=projection_cagr,
            investment=lump_sum_investment,
            horizons_days=DEFAULT_LUMP_SUM_HORIZONS,
        ),
        sip_horizons=sip_projection(
            monthly_amount=sip_monthly,
            cagr=projection_cagr,
            horizons_months=DEFAULT_SIP_HORIZONS,
        ),
        disclaimer=(
            f"{rate_note} Past performance does not predict future returns. "
            "Decision support, not investment advice."
        ),
    )


__all__ = [
    "DEFAULT_LUMP_SUM_HORIZONS",
    "DEFAULT_SIP_HORIZONS",
    "HorizonReturn",
    "StockProjections",
    "compute_stock_projections",
    "lump_sum_projection",
    "sip_projection",
]


# Tiny helper for callers that already have a snapshot date.
def quick_projection_for_amount(
    close: pd.Series,
    snapshot_date: str,
    ticker: str,
    amount: float,
) -> StockProjections:
    return compute_stock_projections(
        ticker, close, snapshot_date, lump_sum_investment=amount
    )



_ = timedelta
