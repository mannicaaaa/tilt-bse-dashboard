"""Custom indicator implementations, verified against pandas-ta in tests/.

We hand-roll RSI and MACD from spec rather than re-export pandas-ta directly.
The pytest parity suite in `tests/indicators/test_parity.py` asserts agreement
to four decimal places on randomized OHLCV. Reason: an interview project that
claims to "scan stocks" should be able to prove the math underneath, not just
trust a library checksum.
"""

from __future__ import annotations

from tilt.indicators.macd import macd
from tilt.indicators.rsi import rsi

__all__ = ["macd", "rsi"]
