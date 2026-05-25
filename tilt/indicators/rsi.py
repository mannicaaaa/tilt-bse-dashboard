"""Wilder's Relative Strength Index, computed from spec.

Reference: J. Welles Wilder Jr., *New Concepts in Technical Trading Systems*
(1978). The smoothing rule is the modified EMA with ``alpha = 1/length`` —
known as Wilder's "running moving average" (RMA).

We compute the smoothing via ``ewm(alpha=1/length, adjust=False)`` directly,
without an SMA seed. This matches pandas-ta's RMA implementation (and so the
test suite asserts exact agreement to four decimal places). Note: this is
*inconsistent* with our MACD module, which does use a TA-Lib SMA seed inside
its EMAs. That asymmetry is deliberate and mirrors pandas-ta itself — their
``ema`` defaults to a TA-Lib-style SMA seed, their ``rma`` does not. We follow
the library's conventions so our outputs are drop-in comparable.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def rsi(close: pd.Series, length: int = 14) -> pd.Series:
    """Compute Wilder RSI on a close-price series.

    Returns a Series aligned to ``close.index``. The first position is NaN
    (the price-change at index 0 is undefined); subsequent values lie in
    [0, 100].

    Behavior at boundaries:
    - Pure uptrend (no losses) → avg_loss → 0 → RS → ∞ → RSI = 100.
    - Pure downtrend (no gains) → avg_gain → 0 → RS = 0 → RSI = 0.
    - Constant series (no movement) → both averages = 0 → RS = 0/0 → NaN.

    The early values during the first ``length`` periods are mathematically
    valid but unstable — the smoothing hasn't had enough samples to settle.
    Treat them with appropriate skepticism in the signal engine.
    """
    if length < 1:
        raise ValueError(f"length must be >= 1, got {length}")

    delta = close.astype(float).diff()
    gain = delta.clip(lower=0.0)
    loss = (-delta).clip(lower=0.0)

    alpha = 1.0 / length
    avg_gain = gain.ewm(alpha=alpha, adjust=False).mean()
    avg_loss = loss.ewm(alpha=alpha, adjust=False).mean()

    with np.errstate(divide="ignore", invalid="ignore"):
        rs = avg_gain / avg_loss
        rsi_vals = 100.0 - (100.0 / (1.0 + rs))

    return pd.Series(rsi_vals, index=close.index, name=f"RSI_{length}")
