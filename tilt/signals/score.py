"""Composite score per SPEC Wave 3.

Formula: ``0.35·momentum + 0.25·upside + 0.20·rsi + 0.20·sector``.

The SPEC names the four components but doesn't define each one's normalization
to [0, 1]. Choices made here, documented for the interview review:

- **momentum**: ``macd_hist / (1% of price)``, clipped to [0, 1].
  Rationale: a MACD histogram worth ≥ 1% of the current price is rare and
  reads as decisively bullish; anything zero or negative reads as no momentum.
- **upside**: ``pct_below_52w_high / 0.30``, clipped to [0, 1].
  Rationale: 30% room to the 52-week high counts as maxed-out upside;
  beyond that the stock is likely structurally distressed, not "on sale."
- **rsi**: triangle peaked at 53.5 (midpoint of the rally band 45-62), falls
  to 0 at the band edges. Rewards the sweet spot inside the rally regime.
- **sector**: injected from the sector-rotation overlay (step 7); passes
  through unchanged. Already normalized [0, 1] by the overlay.
"""

from __future__ import annotations

from tilt.signals.models import IndicatorSnapshot, ScoreBreakdown

# Weights from SPEC Wave 3 — exposed so the API and tests reference one place.
WEIGHT_MOMENTUM = 0.35
WEIGHT_UPSIDE = 0.25
WEIGHT_RSI = 0.20
WEIGHT_SECTOR = 0.20

_RSI_SWEET_SPOT_CENTER = 53.5  # midpoint of rally band (45 + 62) / 2
_RSI_SWEET_SPOT_HALF_WIDTH = 8.5  # 62 - 53.5
_UPSIDE_SATURATION = 0.30  # 30% below 52w high = max upside contribution
_MOMENTUM_SATURATION_PCT = 0.01  # macd_hist of 1% of price = max momentum


def momentum_score(snap: IndicatorSnapshot, cmp: float) -> float:
    if cmp <= 0:
        return 0.0
    raw = snap.macd_hist / (cmp * _MOMENTUM_SATURATION_PCT)
    return max(0.0, min(1.0, raw))


def upside_score(snap: IndicatorSnapshot) -> float:
    return max(0.0, min(1.0, snap.pct_below_52w_high / _UPSIDE_SATURATION))


def rsi_score(snap: IndicatorSnapshot) -> float:
    distance = abs(snap.rsi - _RSI_SWEET_SPOT_CENTER)
    if distance >= _RSI_SWEET_SPOT_HALF_WIDTH:
        return 0.0
    return 1.0 - distance / _RSI_SWEET_SPOT_HALF_WIDTH


def build_score(
    snap: IndicatorSnapshot,
    cmp: float,
    sector_strength: float,
) -> ScoreBreakdown:
    """Build the weighted ``ScoreBreakdown`` for one ticker.

    ``sector_strength`` is the [0, 1] tag from the sector-rotation overlay;
    pass 0.5 as a neutral placeholder if invoking before step 7 wires that.
    """
    sector_clipped = max(0.0, min(1.0, sector_strength))
    return ScoreBreakdown(
        momentum=momentum_score(snap, cmp) * WEIGHT_MOMENTUM,
        upside=upside_score(snap) * WEIGHT_UPSIDE,
        rsi=rsi_score(snap) * WEIGHT_RSI,
        sector=sector_clipped * WEIGHT_SECTOR,
    )
