import pytest
from pydantic import ValidationError

from favorites_api.config import Settings


def test_environment_defaults_to_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FAVORITES_ENVIRONMENT", raising=False)

    settings = Settings()

    assert settings.environment == "Production"
    assert settings.is_development is False


def test_environment_is_read_from_the_variable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAVORITES_ENVIRONMENT", "Development")

    assert Settings().is_development is True


def test_an_unknown_environment_stops_the_service(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAVORITES_ENVIRONMENT", "Develoment")

    with pytest.raises(ValidationError, match="environment"):
        Settings()


def test_unrelated_variables_are_ignored(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAVORITES_SOMETHING_ELSE", "x")

    assert Settings().environment == "Production"
