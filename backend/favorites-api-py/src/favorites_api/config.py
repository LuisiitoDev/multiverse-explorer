"""Typed settings, read from environment variables.

A missing or invalid value must stop the service with a clear message; it must never fall back to a
value that looks like success (constitution, Principle IV). That is why ``environment`` is a closed
set and why nothing here has a secret as a default.
"""

import secrets
from typing import Literal, Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["Development", "Staging", "Production"]


class ConfigurationError(ValueError):
    """A required setting is missing or unusable. The service must stop and say which one."""


class Settings(BaseSettings):
    """Service settings. Variables carry the ``FAVORITES_`` prefix, with one exception below."""

    # hide_input_in_errors: a validation error must never print the values it was given, because one
    # of them is the session secret (constitution, Principle IV: no secrets in logs).
    model_config = SettingsConfigDict(
        env_prefix="FAVORITES_",
        extra="ignore",
        populate_by_name=True,
        hide_input_in_errors=True,
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

    # Signs the session cookie. At least 32 characters, and required outside Development: a weak or
    # missing secret would let anyone forge a session. In Development a random one is made at start,
    # so sessions end when the service restarts. Every replica must share the same value.
    session_secret: SecretStr | None = None
    session_days: int = Field(default=14, ge=1, le=365)  # same default as the .NET service

    @model_validator(mode="after")
    def _session_secret_is_present_and_strong(self) -> Self:
        if self.session_secret is None:
            if not self.is_development:
                raise ValueError("FAVORITES_SESSION_SECRET is required outside Development")
            self.session_secret = SecretStr(secrets.token_urlsafe(48))
        elif len(self.session_secret.get_secret_value()) < 32:
            raise ValueError("FAVORITES_SESSION_SECRET must have at least 32 characters")
        return self

    def session_key(self) -> str:
        if self.session_secret is None:  # cannot happen once validated; explicit, not asserted
            raise RuntimeError("The session secret was not set by validation")
        return self.session_secret.get_secret_value()

    @property
    def is_development(self) -> bool:
        return self.environment == "Development"
