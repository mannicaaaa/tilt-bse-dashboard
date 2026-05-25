"""Portfolio layer — holdings, PortfolioProvider interface.

The interface lands here at step 8 so the API can wire endpoints against it;
``MockPortfolioProvider`` (build-time) lands at step 10, ``GrowwPortfolioProvider``
(deploy-time) at step 17. Same interface, single-line swap via env var.
"""

from __future__ import annotations

from tilt.portfolio.models import Holding, Portfolio
from tilt.portfolio.provider import EmptyPortfolioProvider, PortfolioProvider

__all__ = [
    "EmptyPortfolioProvider",
    "Holding",
    "Portfolio",
    "PortfolioProvider",
]
