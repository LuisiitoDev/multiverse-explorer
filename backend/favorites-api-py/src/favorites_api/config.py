"""Typed settings, read from environment variables.

A missing or invalid value must stop the service with a clear message; it must never fall back to a
value that looks like success (constitution, Principle IV). That is why ``environment`` is a closed
set and why nothing here has a secret as a default.
"""

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["Development", "Staging", "Production"]


class Settings(BaseSettings):
    """Service settings. Environment variables carry the ``FAVORITES_`` prefix."""

    model_config = SettingsConfigDict(env_prefix="FAVORITES_", extra="ignore")

    # Same three names as ASPNETCORE_ENVIRONMENT in the .NET service. Production is the safe
    # default: the API documentation is off unless the service is started as Development.
    environment: Environment = "Production"

    @property
    def is_development(self) -> bool:
        return self.environment == "Development"
