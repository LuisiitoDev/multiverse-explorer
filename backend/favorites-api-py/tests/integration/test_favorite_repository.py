import threading
import uuid
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import pytest
import sqlalchemy as sa
from sqlalchemy import Engine
from sqlalchemy.exc import IntegrityError

from favorites_api.application.ports import Added, AlreadyExists
from favorites_api.infrastructure.persistence.repositories import SqlFavoriteRepository
from favorites_api.infrastructure.persistence.tables import favorites, users

from .conftest import utc_now

MakeUser = Callable[[], uuid.UUID]


@pytest.fixture
def repository(engine: Engine) -> SqlFavoriteRepository:
    return SqlFavoriteRepository(engine)


def add(repository: SqlFavoriteRepository, user: uuid.UUID, kind: str, number: int) -> Added:
    result = repository.try_add(user, kind, number, utc_now())
    assert isinstance(result, Added)
    return result


def test_an_added_favorite_is_listed_with_the_same_values(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    created = utc_now()

    result = repository.try_add(user, "character", 1, created)

    assert isinstance(result, Added)
    assert result.favorite.id > 0
    assert result.favorite.create_at == created
    assert repository.get_by_user(user) == [result.favorite]


def test_favorites_are_listed_newest_first(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    start = utc_now()
    for number, offset in [(1, 0), (2, 2), (3, 1)]:
        repository.try_add(user, "character", number, start + timedelta(seconds=offset))

    assert [f.resource_id for f in repository.get_by_user(user)] == [2, 3, 1]


def test_the_order_is_stable_when_two_favorites_share_a_time(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    same = utc_now()
    first = repository.try_add(user, "character", 1, same)
    second = repository.try_add(user, "character", 2, same)
    assert isinstance(first, Added)
    assert isinstance(second, Added)

    listed = [f.id for f in repository.get_by_user(user)]

    assert listed == [second.favorite.id, first.favorite.id]


def test_the_type_filter_returns_only_that_type(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    add(repository, user, "character", 1)
    add(repository, user, "location", 1)
    add(repository, user, "location", 2)

    assert {f.resource_id for f in repository.get_by_user(user, "location")} == {1, 2}
    assert repository.get_by_user(user, "episode") == []


@pytest.mark.parametrize("blank", [None, "", "   "])
def test_a_blank_filter_returns_everything(
    repository: SqlFavoriteRepository, make_user: MakeUser, blank: str | None
) -> None:
    user = make_user()
    add(repository, user, "character", 1)
    add(repository, user, "episode", 1)

    assert len(repository.get_by_user(user, blank)) == 2


def test_a_user_does_not_see_the_favorites_of_another(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    mine, theirs = make_user(), make_user()
    add(repository, theirs, "character", 1)

    assert repository.get_by_user(mine) == []


def test_exists_tells_a_saved_resource_from_one_that_is_not(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    add(repository, user, "character", 1)

    assert repository.exists(user, "character", 1) is True
    assert repository.exists(user, "character", 2) is False
    assert repository.exists(user, "episode", 1) is False
    assert repository.exists(make_user(), "character", 1) is False


def test_adding_the_same_favorite_twice_is_a_result_not_an_error(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    add(repository, user, "character", 1)

    second = repository.try_add(user, "character", 1, utc_now())

    assert second == AlreadyExists()
    assert len(repository.get_by_user(user)) == 1


def test_the_same_resource_is_allowed_for_another_user_and_another_type(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    one, other = make_user(), make_user()
    add(repository, one, "character", 1)

    add(repository, other, "character", 1)
    add(repository, one, "episode", 1)


def test_simultaneous_identical_adds_store_exactly_one(
    engine: Engine, repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    workers = 8
    start = threading.Barrier(workers)

    def attempt() -> object:
        start.wait()
        return repository.try_add(user, "episode", 7, utc_now())

    with ThreadPoolExecutor(max_workers=workers) as pool:
        results = [f.result() for f in [pool.submit(attempt) for _ in range(workers)]]

    assert sum(isinstance(r, Added) for r in results) == 1
    assert sum(isinstance(r, AlreadyExists) for r in results) == workers - 1
    with engine.connect() as connection:
        stored = connection.execute(
            sa.select(sa.func.count()).select_from(favorites).where(favorites.c.UserId == user)
        ).scalar_one()
    assert stored == 1


def test_adding_for_a_user_that_does_not_exist_raises_and_is_not_a_duplicate(
    repository: SqlFavoriteRepository,
) -> None:
    with pytest.raises(IntegrityError):
        repository.try_add(uuid.uuid4(), "character", 1, utc_now())


def test_a_non_ascii_value_survives_the_round_trip(
    engine: Engine, repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    with engine.begin() as connection:
        connection.execute(
            sa.update(users).where(users.c.Id == user).values(DisplayName="Rick Sánchez 🧪 リック")
        )
        name = connection.execute(
            sa.select(users.c.DisplayName).where(users.c.Id == user)
        ).scalar_one()

    assert name == "Rick Sánchez 🧪 リック"
    assert repository.get_by_user(user) == []


def test_delete_removes_only_the_owners_favorite(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    owner, other = make_user(), make_user()
    favorite = add(repository, owner, "character", 1).favorite

    assert repository.delete(favorite.id, other) is False
    assert repository.get_by_user(owner) == [favorite]

    assert repository.delete(favorite.id, owner) is True
    assert repository.get_by_user(owner) == []


def test_delete_of_a_missing_favorite_is_false(
    repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    assert repository.delete(2_147_483_647, make_user()) is False


def test_deleting_a_user_removes_the_favorites_as_the_schema_says(
    engine: Engine, repository: SqlFavoriteRepository, make_user: MakeUser
) -> None:
    user = make_user()
    add(repository, user, "character", 1)

    with engine.begin() as connection:
        connection.execute(sa.delete(users).where(users.c.Id == user))

    assert repository.get_by_user(user) == []
