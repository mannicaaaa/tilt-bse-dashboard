"""MACD — Moving Average Convergence Divergence, computed from spec.

Reference: Gerald Appel (1979). Defaults 12/26/9 are the canonical Appel values.

The EMA inside follows the **TA-Lib convention** (used by TradingView,
MetaTrader, and pandas-ta by default):

1. Position ``length-1`` is seeded with the SMA of the first ``length`` prices.
2. Positions before that are NaN.
3. From position ``length-1`` onward the recursion is the textbook EMA,
   ``EMA[t] = alpha * price[t] + (1 - alpha) * EMA[t-1]`` with
   ``alpha = 2/(N+1)``.

We pick the TA-Lib form over the "EMA[0] = price[0]" form because every real
trading platform uses the former — so when a chart says "MACD crossed today",
the numbers a Tilt user sees should agree with the chart they pulled it from.

The signal line is computed on the macd line **after dropping its leading
warmup NaNs**, so the signal's own SMA seed uses the first ``signal`` valid
macd values rather than including positions where the macd line is undefined.
This mirrors pandas-ta and TA-Lib.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def _ema_talib(series: pd.Series, length: int) -> pd.Series:
    """EMA with TA-Lib's SMA seed.

    Output is NaN for the first ``length - 1`` positions; position ``length-1``
    is the SMA of the first ``length`` values; positions after that follow the
    standard EMA recursion with ``adjust=False``.
    """
    seeded = series.copy()
    sma = seeded.iloc[:length].mean()
    seeded.iloc[: length - 1] = np.nan
    seeded.iloc[length - 1] = sma
    return seeded.ewm(span=length, adjust=False).mean()


def macd(
    close: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
) -> pd.DataFrame:
    """Compute MACD line, signal line, and histogram.

    Returns a DataFrame with columns ``macd``, ``signal``, ``histogram`` aligned
    to ``close.index``. Warmup positions are NaN: the macd line goes valid at
    index ``slow-1``, the signal/histogram at index ``slow + signal - 2``.
    """
    if fast >= slow:
        raise ValueError(f"fast ({fast}) must be < slow ({slow})")
    if signal < 1:
        raise ValueError(f"signal must be >= 1, got {signal}")
    if len(close) < slow + signal - 1:
        nan_col = pd.Series(np.nan, index=close.index)
        return pd.DataFrame(
            {"macd": nan_col, "signal": nan_col.copy(), "histogram": nan_col.copy()},
            index=close.index,
        )

    close = close.astype(float)
    ema_fast = _ema_talib(close, fast)
    ema_slow = _ema_talib(close, slow)
    macd_line = ema_fast - ema_slow

    # Trim leading NaN before computing signal so the SMA seed uses the first
    # `signal` valid macd values, then reindex back onto the original index.
    macd_valid = macd_line.dropna()
    signal_line = _ema_talib(macd_valid, signal).reindex(close.index)
    histogram = macd_line - signal_line

    return pd.DataFrame(
        {
            "macd": macd_line,
            "signal": signal_line,
            "histogram": histogram,
        },
        index=close.index,
    )
