"""Typed settings, read from environment variables.

A missing or invalid value must stop the service with a clear message; it must never fall back to a
value that looks like success (constitution, Principle IV). That is why ``environment`` is a closed
set and why nothing here has a secret as a default.
"""

from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["Development", "Staging", "Production"]


class ConfigurationError(ValueError):
    """A required setting is missing or unusable. The service must stop and say which one."""


class Settings(BaseSettings):
    """Service settings. Variables carry the ``FAVORITES_`` prefix, with one exception below."""

    model_config = SettingsConfigDict(
        env_prefix="FAVORITES_", extra="ignore", populate_by_name=True
    )

    # Same three names as ASPNETCORE_ENVIRONMENT in the .NET service. Production is the safe
    # default: the API documentation is off unless the service is started as Development.
    environment: Environment = "Production"

    # The one variable without the prefix: it keeps the name and the ADO.NET format the .NET service
    # reads, so both services can share one configuration during the parallel run. Optional here
    # because /health needs no database; the code that opens the database raises ConfigurationError.
    favorites_db: SecretStr | None = Field(
        default=None, validation_alias="ConnectionStrings__FavoritesDb"
    )

    # FastAPI runs plain `def` routes in a thread pool (documented default: 40 threads). A pool of
    # 20 plus an overflow of 20 gives each of those threads a connection without a long wait.
    db_pool_size: int = Field(default=20, ge=1, le=100)
    db_max_overflow: int = Field(default=20, ge=0, le=100)

    @property
    def is_development(self) -> bool:
        return self.environment == "Development"
