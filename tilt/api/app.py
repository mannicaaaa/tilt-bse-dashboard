"""FastAPI app factory."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tilt import __version__
from tilt.api.routes import router


def create_app() -> FastAPI:
    app = FastAPI(
        title="Tilt",
        description=(
            "Read-only market intelligence dashboard for Indian equities. "
            "Scans the Nifty 500 across 14 sectoral indices with momentum + "
            "value-gap filters; surfaces high-conviction entry signals with "
            "explainable score breakdowns. Built end-to-end with Claude Code."
        ),
        version=__version__,
    )

    # The Vercel-hosted frontend (step 16) will hit this from a different
    # origin. Keep it permissive for the single-user demo; tighten if Tilt
    # ever needs multi-tenant auth.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)
    return app


app = create_app()
