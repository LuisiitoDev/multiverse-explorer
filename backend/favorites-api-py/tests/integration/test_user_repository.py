import uuid
from collections.abc import Callable

from sqlalchemy import Engine

from favorites_api.infrastructure.persistence.repositories import SqlUserRepository


def test_a_user_that_exists_is_found(engine: Engine, make_user: Callable[[], uuid.UUID]) -> None:
    repository = SqlUserRepository(engine)

    assert repository.exists(make_user()) is True


def test_a_user_that_does_not_exist_is_not_found(engine: Engine) -> None:
    assert SqlUserRepository(engine).exists(uuid.uuid4()) is False
