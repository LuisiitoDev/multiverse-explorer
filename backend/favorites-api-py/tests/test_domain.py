"""The domain model and the result types of the ports. The repositories that use them come next."""

import dataclasses
from datetime import datetime
from uuid import uuid4

import pytest

from favorites_api.application.ports import Added, AddResult, AlreadyExists
from favorites_api.domain.models import Favorite


def a_favorite() -> Favorite:
    return Favorite(
        id=1,
        user_id=uuid4(),
        resource_type="character",
        resource_id=7,
        create_at=datetime(2026, 1, 1, 12, 0, 0),  # naive UTC, as datetime2 stores it
    )


def test_a_favorite_cannot_be_changed() -> None:
    favorite = a_favorite()

    with pytest.raises(dataclasses.FrozenInstanceError):
        favorite.resource_id = 8  # type: ignore[misc]


def test_adding_gives_back_the_stored_favorite() -> None:
    favorite = a_favorite()

    result: AddResult = Added(favorite)

    assert isinstance(result, Added)
    assert result.favorite is favorite


def test_a_duplicate_is_a_result_not_an_error() -> None:
    result: AddResult = AlreadyExists()

    assert isinstance(result, AlreadyExists)
    assert not isinstance(result, Added)
