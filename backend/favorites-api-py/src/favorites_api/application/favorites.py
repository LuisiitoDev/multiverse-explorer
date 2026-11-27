"""The favorites use cases: list, create and delete.

Behaviour, order of checks and error messages follow ``FavoriteService`` and the three validators
of the .NET service, which is the reference (spec 001, FR-001 to FR-006). Nothing here knows about
HTTP: a failure is returned as an ``Error`` and the API layer chooses the status code.
"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from favorites_api.application.errors import Error
from favorites_api.application.ports import Added, FavoriteRepository, UserRepository
from favorites_api.domain import resource_types
from favorites_api.domain.models import Favorite

_TYPES_MESSAGE = (
    f"must be one of: {resource_types.CHARACTER}, {resource_types.EPISODE}, "
    f"{resource_types.LOCATION}."
)


@dataclass(frozen=True, slots=True)
class Deleted:
    """The favorite was removed."""


def utc_now() -> datetime:
    """Naive UTC, the way datetime2 stores it."""
    return datetime.now(UTC).replace(tzinfo=None)


def _blank(value: str | None) -> bool:
    return value is None or not value.strip()


def _validation_error(errors: list[str]) -> Error | None:
    # The .NET service joins every message with a space into one detail text.
    return Error.validation(" ".join(errors)) if errors else None


class FavoriteService:
    def __init__(
        self,
        favorites: FavoriteRepository,
        users: UserRepository,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._favorites = favorites
        self._users = users
        self._clock = clock

    def get(self, user_id: UUID, type_filter: str | None) -> list[Favorite] | Error:
        errors: list[str] = []
        if user_id.int == 0:
            errors.append("userId is required.")
        if not _blank(type_filter) and not resource_types.is_valid(type_filter):
            errors.append(f"type {_TYPES_MESSAGE}")
        if error := _validation_error(errors):
            return error

        resource_type = None if _blank(type_filter) else resource_types.normalize(str(type_filter))
        return self._favorites.get_by_user(user_id, resource_type)

    def create(
        self, user_id: UUID, resource_type: str | None, resource_id: int
    ) -> Favorite | Error:
        errors: list[str] = []
        if user_id.int == 0:
            errors.append("userId is required.")
        if _blank(resource_type):
            errors.append("resourceType is required.")
        elif not resource_types.is_valid(resource_type):
            errors.append(f"resourceType {_TYPES_MESSAGE}")
        if resource_id <= 0:
            errors.append("resourceId must be greater than zero.")
        if error := _validation_error(errors):
            return error
        stored_type = resource_types.normalize(str(resource_type))

        if not self._users.exists(user_id):
            return Error.not_found(f"User '{user_id}' was not found.")

        already = Error.conflict("The resource is already in the user's favorites.")
        if self._favorites.exists(user_id, stored_type, resource_id):
            return already
        # Two requests can both pass the check above; the repository settles the race.
        result = self._favorites.try_add(user_id, stored_type, resource_id, self._clock())
        return result.favorite if isinstance(result, Added) else already

    def delete(self, favorite_id: int, user_id: UUID) -> Deleted | Error:
        errors: list[str] = []
        if user_id.int == 0:
            errors.append("userId is required.")
        if favorite_id <= 0:
            errors.append("id must be greater than zero.")
        if error := _validation_error(errors):
            return error

        # Only the owner's favorite is deleted; someone else's looks the same as a missing one.
        if not self._favorites.delete(favorite_id, user_id):
            return Error.not_found(f"Favorite '{favorite_id}' was not found.")
        return Deleted()
