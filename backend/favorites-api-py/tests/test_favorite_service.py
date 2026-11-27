"""The favorites use cases against in-memory repositories (no database, no HTTP)."""

from datetime import datetime
from uuid import UUID, uuid4

import pytest

from favorites_api.application.errors import Error, ErrorType
from favorites_api.application.favorites import Deleted, FavoriteService
from favorites_api.application.ports import Added, AddResult, AlreadyExists
from favorites_api.domain.models import Favorite

NOW = datetime(2026, 1, 2, 3, 4, 5)
ME = uuid4()
OTHER = uuid4()


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


@pytest.fixture
def store() -> InMemoryFavorites:
    return InMemoryFavorites()


@pytest.fixture
def service(store: InMemoryFavorites) -> FavoriteService:
    return FavoriteService(store, InMemoryUsers(ME, OTHER), clock=lambda: NOW)


def error_of(result: object) -> Error:
    assert isinstance(result, Error), result
    return result


# --- create -----------------------------------------------------------------------------------


def test_create_stores_the_type_in_lower_case_and_stamps_the_time(service: FavoriteService) -> None:
    result = service.create(ME, "Character", 7)

    assert result == Favorite(1, ME, "character", 7, NOW)


@pytest.mark.parametrize("kind", ["character", "EPISODE", "Location"])
def test_create_accepts_the_three_types_in_any_case(service: FavoriteService, kind: str) -> None:
    assert isinstance(service.create(ME, kind, 1), Favorite)


@pytest.mark.parametrize("resource_type", [None, "", "   "])
def test_create_without_a_type_says_it_is_required(
    service: FavoriteService, resource_type: str | None
) -> None:
    error = error_of(service.create(ME, resource_type, 1))

    assert (error.type, error.message) == (ErrorType.VALIDATION, "resourceType is required.")


def test_create_with_an_unknown_type_lists_the_valid_ones(service: FavoriteService) -> None:
    error = error_of(service.create(ME, "planet", 1))

    assert error.type is ErrorType.VALIDATION
    assert error.message == "resourceType must be one of: character, episode, location."


@pytest.mark.parametrize("resource_id", [0, -1])
def test_create_needs_a_positive_resource_id(service: FavoriteService, resource_id: int) -> None:
    error = error_of(service.create(ME, "character", resource_id))

    assert error.message == "resourceId must be greater than zero."


def test_create_reports_every_validation_problem_in_one_message(service: FavoriteService) -> None:
    error = error_of(service.create(ME, "planet", 0))

    assert error.message == (
        "resourceType must be one of: character, episode, location. "
        "resourceId must be greater than zero."
    )


def test_create_for_the_nil_user_is_a_validation_error(service: FavoriteService) -> None:
    error = error_of(service.create(UUID(int=0), "character", 1))

    assert error.message == "userId is required."


def test_create_for_an_unknown_user_is_not_found(store: InMemoryFavorites) -> None:
    service = FavoriteService(store, InMemoryUsers(), clock=lambda: NOW)
    stranger = uuid4()

    error = error_of(service.create(stranger, "character", 1))

    assert (error.type, error.message) == (ErrorType.NOT_FOUND, f"User '{stranger}' was not found.")


def test_validation_comes_before_the_user_lookup(store: InMemoryFavorites) -> None:
    service = FavoriteService(store, InMemoryUsers(), clock=lambda: NOW)

    assert error_of(service.create(uuid4(), "planet", 1)).type is ErrorType.VALIDATION


def test_create_twice_is_a_conflict_even_in_another_letter_case(service: FavoriteService) -> None:
    service.create(ME, "character", 1)

    error = error_of(service.create(ME, "CHARACTER", 1))

    assert (error.type, error.message) == (
        ErrorType.CONFLICT,
        "The resource is already in the user's favorites.",
    )


def test_two_users_can_save_the_same_resource(service: FavoriteService) -> None:
    service.create(ME, "character", 1)

    assert isinstance(service.create(OTHER, "character", 1), Favorite)


def test_a_duplicate_found_only_when_storing_is_a_conflict(
    service: FavoriteService, store: InMemoryFavorites
) -> None:
    store.race = True

    assert error_of(service.create(ME, "character", 1)).type is ErrorType.CONFLICT


# --- get --------------------------------------------------------------------------------------


def test_get_returns_only_my_favorites(service: FavoriteService) -> None:
    service.create(ME, "character", 1)
    service.create(OTHER, "character", 2)

    result = service.get(ME, None)

    assert [f.resource_id for f in result] == [1]  # type: ignore[union-attr]


def test_get_filters_by_type_ignoring_case_and_ignores_a_blank_filter(
    service: FavoriteService,
) -> None:
    service.create(ME, "character", 1)
    service.create(ME, "episode", 2)

    by_type = service.get(ME, "EPISODE")
    blank = service.get(ME, "  ")

    assert [f.resource_id for f in by_type] == [2]  # type: ignore[union-attr]
    assert len(blank) == 2  # type: ignore[arg-type]


def test_get_with_an_unknown_type_is_a_validation_error(service: FavoriteService) -> None:
    error = error_of(service.get(ME, "planet"))

    assert error.type is ErrorType.VALIDATION
    assert error.message == "type must be one of: character, episode, location."


def test_get_for_the_nil_user_is_a_validation_error(service: FavoriteService) -> None:
    assert error_of(service.get(UUID(int=0), None)).message == "userId is required."


# --- delete -----------------------------------------------------------------------------------


def test_delete_removes_my_favorite(service: FavoriteService) -> None:
    created = service.create(ME, "character", 1)
    assert isinstance(created, Favorite)

    assert service.delete(created.id, ME) == Deleted()
    assert service.get(ME, None) == []


def test_delete_of_someone_elses_favorite_is_not_found_and_leaves_it(
    service: FavoriteService,
) -> None:
    created = service.create(OTHER, "character", 1)
    assert isinstance(created, Favorite)

    error = error_of(service.delete(created.id, ME))

    assert (error.type, error.message) == (
        ErrorType.NOT_FOUND,
        f"Favorite '{created.id}' was not found.",
    )
    assert len(service.get(OTHER, None)) == 1  # type: ignore[arg-type]


def test_delete_of_a_missing_favorite_is_not_found(service: FavoriteService) -> None:
    assert error_of(service.delete(99, ME)).type is ErrorType.NOT_FOUND


@pytest.mark.parametrize("favorite_id", [0, -3])
def test_delete_needs_a_positive_id(service: FavoriteService, favorite_id: int) -> None:
    error = error_of(service.delete(favorite_id, ME))

    assert (error.type, error.message) == (ErrorType.VALIDATION, "id must be greater than zero.")


def test_delete_for_the_nil_user_is_a_validation_error(service: FavoriteService) -> None:
    assert error_of(service.delete(1, UUID(int=0))).message == "userId is required."


def test_the_default_clock_gives_naive_utc() -> None:
    from favorites_api.application.favorites import utc_now

    assert utc_now().tzinfo is None
