"""The mapping in tables.py must describe the schema EF created, column by column."""

import re

import sqlalchemy as sa
from sqlalchemy import Engine

from favorites_api.infrastructure.persistence.tables import metadata


def _type_name(column_type: sa.types.TypeEngine[object], engine: Engine) -> str:
    # The reflected type carries the column collation; the mapping does not need to.
    name = str(column_type.compile(dialect=engine.dialect)).upper()
    return re.sub(r"\s+COLLATE\s+\S+", "", name)


def test_every_mapped_column_matches_the_real_column(engine: Engine) -> None:
    inspector = sa.inspect(engine)

    for table in metadata.sorted_tables:
        real = {column["name"]: column for column in inspector.get_columns(table.name)}
        assert set(real) == {column.name for column in table.columns}, table.name
        for column in table.columns:
            actual = real[column.name]
            where = f"{table.name}.{column.name}"
            assert _type_name(column.type, engine) == _type_name(actual["type"], engine), where
            assert column.nullable == actual["nullable"], where


def test_the_indexes_the_code_relies_on_exist(engine: Engine) -> None:
    inspector = sa.inspect(engine)

    def unique_columns(table: str) -> set[tuple[str, ...]]:
        return {
            tuple(name for name in index["column_names"] if name is not None)
            for index in inspector.get_indexes(table)
            if index.get("unique")
        }

    assert ("UserId", "ResourceType", "ResourceId") in unique_columns("Favorites")
    assert ("Provider", "ProviderUserId") in unique_columns("ExternalLogins")
    assert ("Email",) in unique_columns("Users")


def test_deleting_a_user_cascades_in_the_schema(engine: Engine) -> None:
    inspector = sa.inspect(engine)

    for table in ("Favorites", "ExternalLogins"):
        (foreign_key,) = inspector.get_foreign_keys(table)
        assert foreign_key["referred_table"] == "Users", table
        assert foreign_key["options"].get("ondelete") == "CASCADE", table
