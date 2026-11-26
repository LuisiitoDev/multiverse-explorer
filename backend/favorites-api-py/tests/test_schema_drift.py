"""Fails when a new EF migration is added and the schema fixture was not regenerated.

The Python service never changes the schema (spec 001, FR-014), so the integration tests build the
database from the script EF generates. If that script is older than the migrations, the tests would
pass against a schema that production no longer has.
"""

import re
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parents[2]
MIGRATIONS = BACKEND / "src" / "Favorites.Infrastructure" / "Persistence" / "Migrations"
FIXTURE = Path(__file__).with_name("integration") / "schema.sql"


def test_the_schema_fixture_has_every_migration_of_the_dotnet_project() -> None:
    if not MIGRATIONS.is_dir():
        pytest.skip("backend/src is not in this checkout")

    in_repository = {
        match.group(1)
        for path in MIGRATIONS.glob("*.cs")
        if (match := re.fullmatch(r"(\d{14}_\w+)\.cs", path.name))
    }
    in_fixture = set(re.findall(r"N'(\d{14}_\w+)'", FIXTURE.read_text(encoding="utf-8")))

    assert in_repository, "no migrations found: the path in this test is probably wrong"
    assert in_fixture == in_repository, (
        "tests/integration/schema.sql is out of date. Regenerate it; the command is in its header."
    )
