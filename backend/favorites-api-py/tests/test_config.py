import pytest
from pydantic import SecretStr, ValidationError

from favorites_api.config import Settings


def test_environment_defaults_to_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FAVORITES_ENVIRONMENT", raising=False)
    monkeypatch.setenv("FAVORITES_SESSION_SECRET", "s" * 32)

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
    monkeypatch.setenv("FAVORITES_SESSION_SECRET", "s" * 32)

    assert Settings().environment == "Production"


def test_a_secret_is_required_outside_development(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FAVORITES_SESSION_SECRET", raising=False)
    monkeypatch.setenv("FAVORITES_ENVIRONMENT", "Production")

    with pytest.raises(ValidationError, match="FAVORITES_SESSION_SECRET is required"):
        Settings()


def test_development_makes_a_random_secret_when_none_is_given(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("FAVORITES_SESSION_SECRET", raising=False)
    monkeypatch.setenv("FAVORITES_ENVIRONMENT", "Development")

    first, second = Settings().session_key(), Settings().session_key()

    assert len(first) >= 32
    assert first != second


def test_a_short_secret_is_refused(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAVORITES_SESSION_SECRET", "too-short")

    with pytest.raises(ValidationError, match="at least 32 characters"):
        Settings()


def test_the_secret_is_never_shown_in_an_error_or_a_repr(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAVORITES_SESSION_SECRET", "short-but-secret")

    with pytest.raises(ValidationError) as caught:
        Settings()

    assert "short-but-secret" not in str(caught.value)
    assert "input_value" not in str(caught.value)
    assert "x" * 20 not in repr(Settings(session_secret=SecretStr("x" * 40)))


@pytest.mark.parametrize("days", ["0", "366"])
def test_session_days_must_be_between_1_and_365(monkeypatch: pytest.MonkeyPatch, days: str) -> None:
    monkeypatch.setenv("FAVORITES_SESSION_SECRET", "s" * 32)
    monkeypatch.setenv("FAVORITES_SESSION_DAYS", days)

    with pytest.raises(ValidationError, match="session_days"):
        Settings()
