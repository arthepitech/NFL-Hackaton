"""API Trench Lab : `uvicorn api.main:app`."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router
from api.routes_v2 import router as router_v2
from api.routes_v3 import router as router_v3
from api.store import Store
from config import settings


def create_app(processed_dir: Path = settings.PROCESSED_DIR) -> FastAPI:
    app = FastAPI(title="Trench Lab")
    app.state.store = Store(processed_dir)
    cors_env = os.environ.get("CORS_ORIGINS", "")
    origins = [o.strip() for o in cors_env.split(",") if o.strip()]
    if not origins:
        origins = ["http://localhost:5173", "http://localhost:3000"]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins if "*" not in origins else ["*"],
        allow_origin_regex=os.environ.get("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
        allow_credentials=True if "*" not in origins else False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    app.include_router(router_v2)
    app.include_router(router_v3)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
