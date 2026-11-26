"""What the use cases need from persistence. Infrastructure implements these."""

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol
from uuid import UUID

from favorites_api.domain.models import Favorite


@dataclass(frozen=True, slots=True)
class Added:
    favorite: Favorite


@dataclass(frozen=True, slots=True)
class AlreadyExists:
    """The user already has this resource as a favorite. A result, not an error."""


AddResult = Added | AlreadyExists


class FavoriteRepository(Protocol):
    def get_by_user(self, user_id: UUID, resource_type: str | None = None) -> list[Favorite]:
        """The user's favorites, newest first. ``resource_type`` is already normalized."""
        ...

    def exists(self, user_id: UUID, resource_type: str, resource_id: int) -> bool: ...

    def try_add(
        self, user_id: UUID, resource_type: str, resource_id: int, create_at: datetime
    ) -> AddResult:
        """Store a favorite; a duplicate, even from a race, is ``AlreadyExists``."""
        ...

    def delete(self, favorite_id: int, user_id: UUID) -> bool:
        """Remove the favorite only if it belongs to the user. True when a row was removed."""
        ...


class UserRepository(Protocol):
    def exists(self, user_id: UUID) -> bool: ...
