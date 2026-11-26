import pytest
from pydantic import SecretStr
from sqlalchemy.engine import URL

from favorites_api.config import ConfigurationError, Settings
from favorites_api.infrastructure.persistence.connection import (
    create_db_engine,
    parse_connection_string,
)

# The shape docker-compose.yml gives the .NET service. The password here is a placeholder.
COMPOSE = (
    "Server=db,1433;Database=FavoritesDb;User Id=sa;Password=placeholder;"
    "TrustServerCertificate=True;Encrypt=True"
)


def test_parses_the_string_the_dotnet_service_uses() -> None:
    url = parse_connection_string(COMPOSE)

    assert url.drivername == "mssql+mssqlpython"
    assert (url.host, url.port, url.database, url.username) == ("db", 1433, "FavoritesDb", "sa")
    assert url.password == "placeholder"
    assert dict(url.query) == {"TrustServerCertificate": "yes", "Encrypt": "yes"}


def test_server_without_a_port_and_with_tcp_prefix() -> None:
    url = parse_connection_string("Server=tcp:db.example.test;Database=d;User Id=u;Password=p")

    assert (url.host, url.port) == ("db.example.test", None)


@pytest.mark.parametrize(
    ("keyword", "expected"),
    [("Initial Catalog", "d"), ("Data Source", "h"), ("UID", "u"), ("PWD", "p")],
)
def test_accepts_the_ado_net_synonyms(keyword: str, expected: str) -> None:
    base = {"Data Source": "h", "Initial Catalog": "d", "UID": "u", "PWD": "p"}
    raw = ";".join(f"{k}={v}" for k, v in base.items())

    url = parse_connection_string(raw)

    assert expected in {url.host, url.database, url.username, url.password}, keyword


def test_keywords_are_case_insensitive_and_spaces_are_ignored() -> None:
    url = parse_connection_string(" server = h ; DATABASE = d ; user id = u ; PASSWORD = p ")

    assert (url.host, url.database, url.username, url.password) == ("h", "d", "u", "p")


@pytest.mark.parametrize(
    ("raw_password", "expected"),
    [
        ('"a;b=c"', "a;b=c"),
        ("'it''s'", "it's"),
        ('"say ""hi"""', 'say "hi"'),
    ],
)
def test_quoted_values_may_contain_separators_and_quotes(raw_password: str, expected: str) -> None:
    url = parse_connection_string(f"Server=h;Database=d;User Id=u;Password={raw_password}")

    assert url.password == expected


def test_an_unsupported_keyword_stops_the_service_and_names_it() -> None:
    with pytest.raises(ConfigurationError, match="Connect Timeout"):
        parse_connection_string(COMPOSE + ";Connect Timeout=30")


@pytest.mark.parametrize(
    ("raw", "message"),
    [
        ("Database=d;User Id=u;Password=p", "no 'Server'"),
        ("Server=h;User Id=u;Password=p", "no 'Database'"),
        ("Server=h;Database=d;Password=p", "'User Id' and 'Password'"),
        ("Server=h;Database=d;User Id=u", "'User Id' and 'Password'"),
        ("Server=h,abc;Database=d;User Id=u;Password=p", "not a number"),
        ("Server=h;Database=d;User Id=u;Password=p;Encrypt=maybe", "True or False"),
        ("Server=h;Database=d;User Id=u;Password=p;Oops", "without '='"),
        ('Server=h;Database=d;User Id=u;Password="open', "unclosed quote"),
        ('Server=h;Database=d;User Id=u;Password="a"b', "after a quoted value"),
    ],
)
def test_unusable_strings_are_refused_with_a_clear_message(raw: str, message: str) -> None:
    with pytest.raises(ConfigurationError, match=message):
        parse_connection_string(raw)


def test_the_error_never_contains_the_password() -> None:
    with pytest.raises(ConfigurationError) as caught:
        parse_connection_string("Server=h;Database=d;User Id=u;Password=s3cr3t-value;Bogus=1")

    assert "s3cr3t-value" not in str(caught.value)


def test_a_missing_setting_stops_the_service(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ConnectionStrings__FavoritesDb", raising=False)

    with pytest.raises(ConfigurationError, match="ConnectionStrings__FavoritesDb"):
        create_db_engine(Settings())


def test_the_setting_is_read_from_the_dotnet_variable_name(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ConnectionStrings__FavoritesDb", COMPOSE)

    settings = Settings()

    assert settings.favorites_db is not None
    assert settings.favorites_db.get_secret_value() == COMPOSE


def test_the_connection_string_is_never_shown_in_a_repr() -> None:
    settings = Settings(favorites_db=SecretStr(COMPOSE))

    assert "placeholder" not in repr(settings)
    assert "placeholder" not in str(settings)


def test_the_engine_uses_the_configured_pool(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("FAVORITES_DB_POOL_SIZE", "5")
    monkeypatch.setenv("FAVORITES_DB_MAX_OVERFLOW", "7")
    settings = Settings(favorites_db=SecretStr(COMPOSE))

    engine = create_db_engine(settings)

    assert engine.pool.size() == 5  # type: ignore[attr-defined]
    assert engine.pool._max_overflow == 7  # type: ignore[attr-defined]
    assert isinstance(engine.url, URL)


@pytest.mark.parametrize("name", ["FAVORITES_DB_POOL_SIZE", "FAVORITES_DB_MAX_OVERFLOW"])
def test_a_pool_setting_out_of_range_stops_the_service(
    monkeypatch: pytest.MonkeyPatch, name: str
) -> None:
    monkeypatch.setenv(name, "1000")

    with pytest.raises(ValueError, match=r"less than or equal to 100"):
        Settings()
