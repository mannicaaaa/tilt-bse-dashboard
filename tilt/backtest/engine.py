"""Walk-forward Rally-filter backtest.

Algorithm (lookahead-free):
1. Precompute the full indicator series once per ticker (RSI, MACD, EMA20).
   These are themselves lookahead-free — every value at bar t only uses data
   ≤ t — so reading ``rsi.iloc[t]`` after precompute is equivalent to
   recomputing on ``close.iloc[: t+1]`` but ~Nx faster.
2. Walk bars ``t = warmup..(n - hold_period)``, evaluate the rally filter at
   each bar using only bar-t-and-earlier values, and record a signal if it
   fires.
3. For each signal, look ``hold_period`` bars forward to compute return + the
   worst intra-hold drawdown.

Survivorship + lookahead biases discussed in the README disclosure block:
- Survivorship: we use today's universe across the full backtest window.
  Names that were delisted before today are absent → results skew optimistic.
- Filter-tuning lookahead: the filter thresholds (RSI 45-62, etc) were chosen
  with knowledge of recent market behavior, not blind to history. The
  ``backtest-runner`` sub-agent's parameter-sweep capability is meant to be
  honest about this — show how sensitive the metrics are to those choices.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from statistics import mean

import pandas as pd

from tilt.backtest.models import BacktestMetrics
from tilt.data import DataFetcher
from tilt.indicators import macd as macd_fn
from tilt.indicators import rsi as rsi_fn
from tilt.signals.filters import (
    RALLY_MACD_CROSSOVER_WINDOW,
    RALLY_MIN_52W_GAP,
    RALLY_RSI_HIGH,
    RALLY_RSI_LOW,
)

log = logging.getLogger(__name__)

DEFAULT_HOLD_PERIOD = 30  # trading days to hold after a Rally trigger
_TRADING_DAYS_PER_YEAR = 252
_WARMUP_BARS = 33  # MACD signal becomes valid at index slow+signal-2 = 33


@dataclass(frozen=True)
class RallySignalEvent:
    ticker: str
    bar_index: int
    date: str  # ISO date
    entry_price: float
    exit_price: float
    fwd_return: float  # (exit - entry) / entry
    max_drawdown: float  # worst (low - entry) / entry during hold period


@dataclass(frozen=True)
class BacktestResult:
    start: date
    end: date
    hold_period: int
    universe_size: int
    signals: list[RallySignalEvent]
    metrics: BacktestMetrics


def backtest_ticker(
    ticker: str,
    close: pd.Series,
    hold_period: int = DEFAULT_HOLD_PERIOD,
) -> list[RallySignalEvent]:
    """Walk-forward Rally signal detection for a single ticker."""
    n = len(close)
    if n < _WARMUP_BARS + hold_period + 1:
        return []

    rsi_full = rsi_fn(close, length=14)
    macd_full = macd_fn(close, fast=12, slow=26, signal=9)
    ema20_full = close.ewm(span=20, adjust=False).mean()
    hist = macd_full["histogram"]

    signals: list[RallySignalEvent] = []
    close_vals = close.to_numpy()
    rsi_vals = rsi_full.to_numpy()
    ema20_vals = ema20_full.to_numpy()
    hist_vals = hist.to_numpy()

    # Walk every bar where we have full warmup AND room for forward look.
    for t in range(_WARMUP_BARS, n - hold_period):
        cmp = close_vals[t]
        rsi_t = rsi_vals[t]
        ema20_t = ema20_vals[t]
        if pd.isna(cmp) or pd.isna(rsi_t) or pd.isna(ema20_t):
            continue

        # 52-week high computed from data up to and including bar t.
        window_start = max(0, t - _TRADING_DAYS_PER_YEAR + 1)
        high_52w = close_vals[window_start : t + 1].max()
        pct_below = (high_52w - cmp) / high_52w if high_52w > 0 else 0.0

        # MACD crossover within last `RALLY_MACD_CROSSOVER_WINDOW` bars.
        crossover = False
        for j in range(max(1, t - RALLY_MACD_CROSSOVER_WINDOW + 1), t + 1):
            if pd.isna(hist_vals[j]) or pd.isna(hist_vals[j - 1]):
                continue
            if hist_vals[j] > 0 and hist_vals[j - 1] <= 0:
                crossover = True
                break

        if not (
            crossover
            and cmp > ema20_t
            and RALLY_RSI_LOW <= rsi_t <= RALLY_RSI_HIGH
            and pct_below >= RALLY_MIN_52W_GAP
        ):
            continue

        exit_price = close_vals[t + hold_period]
        hold_window = close_vals[t + 1 : t + hold_period + 1]
        worst = hold_window.min()
        # Drawdown is loss-only: if price never dipped below entry, drawdown = 0.
        drawdown = min(0.0, float((worst - cmp) / cmp))
        signals.append(
            RallySignalEvent(
                ticker=ticker,
                bar_index=t,
                date=close.index[t].date().isoformat(),
                entry_price=float(cmp),
                exit_price=float(exit_price),
                fwd_return=float((exit_price - cmp) / cmp),
                max_drawdown=drawdown,
            )
        )

    return signals


def compute_metrics(signals: list[RallySignalEvent]) -> BacktestMetrics:
    if not signals:
        return BacktestMetrics(
            triggers=0,
            hit_rate_30d=0.0,
            avg_fwd_return_30d=0.0,
            max_drawdown_per_signal=0.0,
            avg_drawdown_per_signal=0.0,
        )
    returns = [s.fwd_return for s in signals]
    drawdowns = [s.max_drawdown for s in signals]
    return BacktestMetrics(
        triggers=len(signals),
        hit_rate_30d=sum(1 for r in returns if r > 0) / len(returns),
        avg_fwd_return_30d=mean(returns),
        max_drawdown_per_signal=min(drawdowns),
        avg_drawdown_per_signal=mean(drawdowns),
    )


def run_rally_backtest(
    fetcher: DataFetcher,
    tickers: list[str],
    start: date,
    end: date,
    hold_period: int = DEFAULT_HOLD_PERIOD,
) -> BacktestResult:
    """Pull OHLCV via the fetcher, walk every ticker, aggregate metrics."""
    fetch_result = fetcher.fetch(tickers, start, end)
    all_signals: list[RallySignalEvent] = []
    for ticker, df in fetch_result.data.items():
        if df.empty:
            continue
        all_signals.extend(backtest_ticker(ticker, df["close"], hold_period=hold_period))

    return BacktestResult(
        start=start,
        end=end,
        hold_period=hold_period,
        universe_size=len(tickers),
        signals=all_signals,
        metrics=compute_metrics(all_signals),
    )
