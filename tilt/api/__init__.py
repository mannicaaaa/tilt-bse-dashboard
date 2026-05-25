"""FastAPI surface — the 11-endpoint API per SPEC Wave 4.

All endpoints return the locked response shape documented in CLAUDE.md:
``generated_at`` / ``stale_after`` / ``count`` envelope on scan responses, with
``score_breakdown`` and ``filter_triggers[]`` non-optional on every result row.
"""

from __future__ import annotations

from tilt.api.app import create_app

__all__ = ["create_app"]
