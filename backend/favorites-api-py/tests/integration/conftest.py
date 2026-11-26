"""Integration tests run on a real SQL Server, on a database built from the schema EF generates.

Locally, start the compose database and point the tests at it. The driver does not load on macOS,
so run the suite in a Linux container or the devcontainer:

    docker compose up -d db
    export FAVORITES_TEST_DB_ADMIN="Server=localhost,1433;Database=master;User Id=sa;
        Password=<the compose password>;TrustServerCertificate=True;Encrypt=True"   # one line

Without that variable the tests are skipped, except when ``FAVORITES_REQUIRE_INTEGRATION=1`` (CI
sets it): there a missing database is a failure, so a skipped persistence test never looks like a
pass. Each run creates its own database and drops it at the end.
"""

import os
import re
import uuid
from collections.abc import Callable, Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
import sqlalchemy as sa
from sqlalchemy import Engine
from sqlalchemy.engine import URL

from favorites_api.infrastructure.persistence.connection import parse_connection_string
from favorites_api.infrastructure.persistence.tables import users

ADMIN_VARIABLE = "FAVORITES_TEST_DB_ADMIN"
REQUIRE_VARIABLE = "FAVORITES_REQUIRE_INTEGRATION"
SCHEMA = Path(__file__).with_name("schema.sql")


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    for item in items:
        if "integration" in item.path.parts:
            item.add_marker(pytest.mark.integration)


def _admin_url() -> URL:
    raw = os.environ.get(ADMIN_VARIABLE)
    if not raw:
        message = f"{ADMIN_VARIABLE} is not set, so there is no SQL Server to test against."
        if os.environ.get(REQUIRE_VARIABLE) == "1":
            pytest.fail(message, pytrace=False)
        pytest.skip(message)
    return parse_connection_string(raw)


def _apply_schema(engine: Engine) -> None:
    """Run the EF-generated script. ``GO`` is a client keyword, so the script is split on it."""
    batches = re.split(r"^\s*GO\s*$", SCHEMA.read_text(encoding="utf-8"), flags=re.MULTILINE)
    with engine.execution_options(isolation_level="AUTOCOMMIT").connect() as connection:
        for batch in batches:
            if re.sub(r"--[^\n]*", "", batch).strip():
                connection.exec_driver_sql(batch)


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    admin = _admin_url()
    name = f"FavoritesTest_{uuid.uuid4().hex[:12]}"
    server = sa.create_engine(admin, isolation_level="AUTOCOMMIT")
    with server.connect() as connection:
        connection.exec_driver_sql(f"CREATE DATABASE [{name}]")
    database = sa.create_engine(
        admin.set(database=name), pool_size=20, max_overflow=20, pool_pre_ping=True
    )
    try:
        _apply_schema(database)
        yield database
    finally:
        database.dispose()
        with server.connect() as connection:
            connection.exec_driver_sql(
                f"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE"
            )
            connection.exec_driver_sql(f"DROP DATABASE [{name}]")
        server.dispose()


def utc_now() -> datetime:
    """Naive UTC, which is what datetime2 stores."""
    return datetime.now(UTC).replace(tzinfo=None)


@pytest.fixture
def make_user(engine: Engine) -> Callable[[], uuid.UUID]:
    def create() -> uuid.UUID:
        user_id = uuid.uuid4()
        with engine.begin() as connection:
            connection.execute(
                sa.insert(users).values(
                    Id=user_id,
                    DisplayName="Rick Sanchez",
                    Email=f"{user_id}@example.test",
                    CreateAt=utc_now(),
                )
            )
        return user_id

    return create
