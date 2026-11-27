"""Application factory.

Run it with ``uvicorn favorites_api.app:create_app --factory``. A factory keeps settings out of the
import, so tests can build an app with the settings they need.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib.metadata import version

from fastapi import FastAPI

from favorites_api.api import favorites as favorites_routes
from favorites_api.api import health
from favorites_api.api.csrf import install_csrf_cookie
from favorites_api.api.openapi import hide_validation_responses
from favorites_api.api.problems import install_problem_handler
from favorites_api.api.session import install_session
from favorites_api.application.favorites import FavoriteService
from favorites_api.config import ConfigurationError, Settings
from favorites_api.infrastructure.persistence.connection import create_db_engine
from favorites_api.infrastructure.persistence.repositories import (
    SqlFavoriteRepository,
    SqlUserRepository,
)


@asynccontextmanager
async def _require_favorites(app: FastAPI) -> AsyncIterator[None]:
    """Stop at start-up, with a message that names the setting, when there is no database."""
    if app.state.favorites is None:
        raise ConfigurationError("The setting 'ConnectionStrings__FavoritesDb' is required.")
    yield


def create_app(
    settings: Settings | None = None, favorites: FavoriteService | None = None
) -> FastAPI:
    """``favorites`` lets a test supply the use cases; the service builds them from the settings."""
    settings = settings or Settings()
    development = settings.is_development
    if favorites is None and settings.favorites_db is not None:
        engine = create_db_engine(settings)  # a bad connection string stops the service here
        favorites = FavoriteService(SqlFavoriteRepository(engine), SqlUserRepository(engine))

    app = FastAPI(
        title="Favorites API",
        version=version("favorites-api"),
        # The .NET service serves Scalar only in Development; the same rule applies here.
        docs_url="/docs" if development else None,
        redoc_url=None,
        openapi_url="/openapi.json" if development else None,
        lifespan=_require_favorites,
    )
    app.state.settings = settings
    app.state.favorites = favorites
    install_problem_handler(app)
    hide_validation_responses(app)
    install_csrf_cookie(app, settings)  # before the session: it needs the session
    install_session(app, settings)
    app.include_router(health.router)
    app.include_router(favorites_routes.router)
    return app
