"""Application factory.

Run it with ``uvicorn favorites_api.app:create_app --factory``. A factory keeps settings out of the
import, so tests can build an app with the settings they need.
"""

from importlib.metadata import version

from fastapi import FastAPI

from favorites_api.api import health
from favorites_api.config import Settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    development = settings.is_development

    app = FastAPI(
        title="Favorites API",
        version=version("favorites-api"),
        # The .NET service serves Scalar only in Development; the same rule applies here.
        docs_url="/docs" if development else None,
        redoc_url=None,
        openapi_url="/openapi.json" if development else None,
    )
    app.include_router(health.router)
    return app
