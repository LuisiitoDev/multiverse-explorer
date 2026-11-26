"""Maps the tables the .NET service already owns.

This module only DESCRIBES them: the Python service never creates or alters a table (spec 001,
FR-014). EF Core migrations own the schema until the .NET service is removed. A test compares this
mapping with the real schema, and another fails when a new migration appears (tests/integration).
"""

import sqlalchemy as sa
from sqlalchemy.dialects import mssql

metadata = sa.MetaData()

users = sa.Table(
    "Users",
    metadata,
    sa.Column("Id", sa.Uuid, primary_key=True),
    sa.Column("DisplayName", sa.Unicode(200), nullable=False),
    sa.Column("Email", sa.Unicode(320), nullable=False),
    sa.Column("CreateAt", mssql.DATETIME2, nullable=False),
    sa.Column("UpdateAt", mssql.DATETIME2, nullable=True),
)

external_logins = sa.Table(
    "ExternalLogins",
    metadata,
    sa.Column("Id", sa.BigInteger, primary_key=True, autoincrement=True),
    sa.Column("UserId", sa.Uuid, sa.ForeignKey("Users.Id"), nullable=False),
    sa.Column("Provider", sa.Unicode(50), nullable=False),
    sa.Column("ProviderUserId", sa.Unicode(200), nullable=False),
    sa.Column("CreateAt", mssql.DATETIME2, nullable=False),
)

favorites = sa.Table(
    "Favorites",
    metadata,
    sa.Column("Id", sa.BigInteger, primary_key=True, autoincrement=True),
    sa.Column("UserId", sa.Uuid, sa.ForeignKey("Users.Id"), nullable=False),
    sa.Column("ResourceType", sa.Unicode(50), nullable=False),
    sa.Column("ResourceId", sa.Integer, nullable=False),
    sa.Column("CreateAt", mssql.DATETIME2, nullable=False),
)
