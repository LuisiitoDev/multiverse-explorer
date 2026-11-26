"""Opens the database from the ADO.NET connection string the .NET service already uses.

Reading the same string, from the same variable (``ConnectionStrings__FavoritesDb``), means one
configuration serves both services during the parallel run. Only the keywords below are accepted.
Any other keyword stops the service with a message that names it: an ignored keyword could change
how the connection behaves without anyone noticing (constitution, Principle IV).
"""

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import URL

from favorites_api.config import ConfigurationError, Settings

DRIVER = "mssql+mssqlpython"

_SERVER = {"server", "data source", "address", "addr", "network address"}
_DATABASE = {"database", "initial catalog"}
_USER = {"user id", "uid", "user"}
_PASSWORD = {"password", "pwd"}
_BOOLEANS = {"encrypt": "Encrypt", "trustservercertificate": "TrustServerCertificate"}
_TRUE = {"true", "yes"}
_FALSE = {"false", "no"}

SUPPORTED_KEYWORDS = "Server, Database, User Id, Password, Encrypt, TrustServerCertificate"


def _split(raw: str) -> list[tuple[str, str]]:
    """Split ``key=value;key=value``. A value may be quoted (single or double) to contain ``;``."""
    pairs: list[tuple[str, str]] = []
    i, n = 0, len(raw)
    while i < n:
        eq = raw.find("=", i)
        semicolon = raw.find(";", i)
        if eq == -1 or (semicolon != -1 and semicolon < eq):
            if raw[i : semicolon if semicolon != -1 else n].strip():
                raise ConfigurationError("The connection string has an entry without '='.")
            i = (semicolon if semicolon != -1 else n) + 1
            continue
        key = raw[i:eq].strip()
        i = eq + 1
        while i < n and raw[i] == " ":
            i += 1
        if i < n and raw[i] in "\"'":
            quote = raw[i]
            i += 1
            value = []
            while True:
                if i >= n:
                    raise ConfigurationError("The connection string has an unclosed quote.")
                if raw[i] == quote:
                    if i + 1 < n and raw[i + 1] == quote:  # doubled quote = a literal quote
                        value.append(quote)
                        i += 2
                        continue
                    i += 1
                    break
                value.append(raw[i])
                i += 1
            while i < n and raw[i] == " ":
                i += 1
            if i < n and raw[i] != ";":
                raise ConfigurationError("The connection string has text after a quoted value.")
            i += 1
            pairs.append((key, "".join(value)))
        else:
            end = raw.find(";", i)
            end = n if end == -1 else end
            pairs.append((key, raw[i:end].strip()))
            i = end + 1
    return pairs


def _boolean(keyword: str, value: str) -> str:
    lowered = value.lower()
    if lowered in _TRUE:
        return "yes"
    if lowered in _FALSE:
        return "no"
    raise ConfigurationError(f"'{keyword}' must be True or False in the connection string.")


def parse_connection_string(raw: str) -> URL:
    """An ADO.NET connection string as a SQLAlchemy URL. ConfigurationError if unusable."""
    host: str | None = None
    port: int | None = None
    database = username = password = None
    query: dict[str, str] = {}

    for key, value in _split(raw):
        name = key.lower()
        if name in _SERVER:
            value = value.removeprefix("tcp:")
            host, _, port_text = value.partition(",")
            host = host.strip()
            if port_text.strip():
                try:
                    port = int(port_text)
                except ValueError:
                    raise ConfigurationError("The port of 'Server' is not a number.") from None
        elif name in _DATABASE:
            database = value
        elif name in _USER:
            username = value
        elif name in _PASSWORD:
            password = value
        elif name in _BOOLEANS:
            query[_BOOLEANS[name]] = _boolean(key, value)
        else:
            raise ConfigurationError(
                f"Unsupported connection string keyword '{key}'. Supported: {SUPPORTED_KEYWORDS}."
            )

    if not host:
        raise ConfigurationError("The connection string has no 'Server'.")
    if not database:
        raise ConfigurationError("The connection string has no 'Database'.")
    if not username or password is None:
        raise ConfigurationError("The connection string needs 'User Id' and 'Password'.")

    return URL.create(
        DRIVER,
        username=username,
        password=password,
        host=host,
        port=port,
        database=database,
        query=query,
    )


def create_db_engine(settings: Settings) -> Engine:
    """The engine for the Favorites database. Call it once at startup so a bad setting stops it."""
    if settings.favorites_db is None:
        raise ConfigurationError("The setting 'ConnectionStrings__FavoritesDb' is required.")
    return create_engine(
        parse_connection_string(settings.favorites_db.get_secret_value()),
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_pre_ping=True,
    )
