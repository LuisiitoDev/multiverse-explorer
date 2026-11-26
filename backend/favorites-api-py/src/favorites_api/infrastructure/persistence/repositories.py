from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import Engine
from sqlalchemy.exc import IntegrityError

from favorites_api.application.ports import Added, AddResult, AlreadyExists
from favorites_api.domain.models import Favorite
from favorites_api.infrastructure.persistence.tables import favorites, users


class SqlFavoriteRepository:
    """Favorites in SQL Server. Each method is its own transaction, as in the .NET code."""

    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def get_by_user(self, user_id: UUID, resource_type: str | None = None) -> list[Favorite]:
        statement = sa.select(favorites).where(favorites.c.UserId == user_id)
        if resource_type and resource_type.strip():
            statement = statement.where(favorites.c.ResourceType == resource_type)
        # Newest first. The Id breaks ties so the order is the same on every call.
        statement = statement.order_by(favorites.c.CreateAt.desc(), favorites.c.Id.desc())
        with self._engine.connect() as connection:
            rows = connection.execute(statement).all()
        return [
            Favorite(
                id=row.Id,
                user_id=row.UserId,
                resource_type=row.ResourceType,
                resource_id=row.ResourceId,
                create_at=row.CreateAt,
            )
            for row in rows
        ]

    def exists(self, user_id: UUID, resource_type: str, resource_id: int) -> bool:
        statement = (
            sa.select(sa.literal(1))
            .where(
                favorites.c.UserId == user_id,
                favorites.c.ResourceType == resource_type,
                favorites.c.ResourceId == resource_id,
            )
            .limit(1)
        )
        with self._engine.connect() as connection:
            return connection.execute(statement).first() is not None

    def try_add(
        self, user_id: UUID, resource_type: str, resource_id: int, create_at: datetime
    ) -> AddResult:
        statement = (
            sa.insert(favorites)
            .values(
                UserId=user_id,
                ResourceType=resource_type,
                ResourceId=resource_id,
                CreateAt=create_at,
            )
            .returning(favorites.c.Id, favorites.c.CreateAt)
        )
        try:
            with self._engine.begin() as connection:
                row = connection.execute(statement).one()
        except IntegrityError:
            # The driver reports a duplicate and a missing user as the same error and exposes no SQL
            # Server error number, so the message is not parsed. Look again: if the row is there it
            # was a duplicate (also when two requests raced); if not, it is another failure.
            if self.exists(user_id, resource_type, resource_id):
                return AlreadyExists()
            raise
        return Added(
            Favorite(
                id=row.Id,
                user_id=user_id,
                resource_type=resource_type,
                resource_id=resource_id,
                create_at=row.CreateAt,
            )
        )

    def delete(self, favorite_id: int, user_id: UUID) -> bool:
        statement = sa.delete(favorites).where(
            favorites.c.Id == favorite_id, favorites.c.UserId == user_id
        )
        with self._engine.begin() as connection:
            return connection.execute(statement).rowcount > 0


class SqlUserRepository:
    def __init__(self, engine: Engine) -> None:
        self._engine = engine

    def exists(self, user_id: UUID) -> bool:
        statement = sa.select(sa.literal(1)).where(users.c.Id == user_id).limit(1)
        with self._engine.connect() as connection:
            return connection.execute(statement).first() is not None
