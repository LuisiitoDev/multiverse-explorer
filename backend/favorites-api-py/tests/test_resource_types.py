"""Port of the .NET ResourceTypesTests."""

import pytest

from favorites_api.domain import resource_types


@pytest.mark.parametrize("value", ["character", "Character", "EPISODE", "location"])
def test_is_valid_with_known_type_in_any_casing(value: str) -> None:
    assert resource_types.is_valid(value) is True


@pytest.mark.parametrize("value", ["planet", "", None])
def test_is_valid_with_unknown_or_empty_type(value: str | None) -> None:
    assert resource_types.is_valid(value) is False


def test_normalize_lowercases_the_value() -> None:
    assert resource_types.normalize("CHARACTER") == "character"
