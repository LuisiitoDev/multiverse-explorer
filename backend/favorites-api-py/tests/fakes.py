"""In-memory stand-ins for the repositories, shared by the tests that need no database."""

from datetime import datetime
from uuid import UUID

from favorites_api.application.ports import Added, AddResult, AlreadyExists
from favorites_api.domain.models import Favorite


class InMemoryFavorites:
    def __init__(self) -> None:
        self.rows: list[Favorite] = []
        self.race = False  # when True, try_add reports a duplicate the earlier check did not see

    def get_by_user(self, user_id: UUID, resource_type: str | None = None) -> list[Favorite]:
        return [
            f
            for f in self.rows
            if f.user_id == user_id and resource_type in (None, f.resource_type)
        ]

    def exists(self, user_id: UUID, resource_type: str, resource_id: int) -> bool:
        return any(
            (f.user_id, f.resource_type, f.resource_id) == (user_id, resource_type, resource_id)
            for f in self.rows
        )

    def try_add(
        self, user_id: UUID, resource_type: str, resource_id: int, create_at: datetime
    ) -> AddResult:
        if self.race:
            return AlreadyExists()
        favorite = Favorite(len(self.rows) + 1, user_id, resource_type, resource_id, create_at)
        self.rows.append(favorite)
        return Added(favorite)

    def delete(self, favorite_id: int, user_id: UUID) -> bool:
        before = len(self.rows)
        self.rows = [f for f in self.rows if (f.id, f.user_id) != (favorite_id, user_id)]
        return len(self.rows) < before


class InMemoryUsers:
    def __init__(self, *known: UUID) -> None:
        self.known = set(known)

    def exists(self, user_id: UUID) -> bool:
        return user_id in self.known
