"""API Trench Lab : `uvicorn api.main:app`."""

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
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_methods=["GET", "POST", "PUT", "DELETE"],
    )
    app.include_router(router)
    app.include_router(router_v2)
    app.include_router(router_v3)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
