# Favorites API (FastAPI)

Python service that is replacing the .NET `backend/src/Favorites.Api`. Epic: #132. It keeps the same contract (URLs,
payloads, status codes, cookie and header names) so the web app does not change. Today it has `GET /health` and the data
access layer on the existing SQL Server schema (#135); no endpoint uses it yet. The favorites endpoints, session, CSRF and
sign-in arrive story by story (#136 to #140).

## Run it

Needs [uv](https://docs.astral.sh/uv/) and Python 3.12 (uv installs it for you).

```bash
cd backend/favorites-api-py
uv sync                                                       # creates .venv from uv.lock
FAVORITES_ENVIRONMENT=Development uv run uvicorn favorites_api.app:create_app --factory --port 8080
```

Then open <http://localhost:8080/health> and, in Development only, <http://localhost:8080/docs>.

With Docker, from the repository root (the service is under the `python` profile, so a plain `docker compose up` does
not start it):

```bash
docker compose --profile python up --build api-py
```

It listens on 8080 in the container and on 8081 on your machine.

## Checks (the same ones CI runs)

```bash
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run pytest --cov
```

`pytest --cov` fails below 80% coverage, the minimum of the constitution (Principle III).

### Integration tests (SQL Server)

The tests under `tests/integration/` run on a real SQL Server, on a database built from the script EF Core generates
(`tests/integration/schema.sql`). Each run creates its own database and drops it. Without a server they are **skipped**;
CI sets `FAVORITES_REQUIRE_INTEGRATION=1`, where a missing server is a failure.

The SQL Server driver (`mssql-python`) did not load OpenSSL on an Apple Silicon Mac, so run the suite in Linux: the
devcontainer, or a container like this one (replace the password with the one of your compose database):

```bash
docker compose up -d db
docker run --rm -v "$PWD/backend":/backend -w /backend/favorites-api-py \
  -e FAVORITES_REQUIRE_INTEGRATION=1 -e UV_PROJECT_ENVIRONMENT=/tmp/venv \
  -e "FAVORITES_TEST_DB_ADMIN=Server=host.docker.internal,1433;Database=master;User Id=sa;Password=<password>;TrustServerCertificate=True;Encrypt=True" \
  python:3.12-slim bash -c 'apt-get update -qq && apt-get install -y -qq libltdl7 libkrb5-3 libgssapi-krb5-2 \
    && pip install -q uv && uv sync --frozen && uv run pytest --cov'
```

The amd64 SQL Server image is emulated on Apple Silicon and has crashed on start; start it again if it exits.

### When a new EF migration is added

`tests/test_schema_drift.py` fails until `tests/integration/schema.sql` is regenerated. The command is in the header of that file.

## Settings

Read from environment variables. A missing or invalid value stops the service; nothing has a secret as a default.

| Variable | Values | Default | Effect |
|---|---|---|---|
| `FAVORITES_ENVIRONMENT` | `Development`, `Staging`, `Production` | `Production` | API documentation (`/docs`, `/openapi.json`) is served only in `Development` |
| `ConnectionStrings__FavoritesDb` | ADO.NET connection string | none | Same variable and format as the .NET service, so one configuration serves both. Needed by whatever opens the database; the service stops with a clear message if it is missing or has a keyword other than `Server`, `Database`, `User Id`, `Password`, `Encrypt`, `TrustServerCertificate`. Never printed |
| `FAVORITES_DB_POOL_SIZE` | 1 to 100 | `20` | Connections kept open. FastAPI runs `def` routes in a thread pool (documented default 40 threads), so 20 plus the overflow gives each thread a connection |
| `FAVORITES_DB_MAX_OVERFLOW` | 0 to 100 | `20` | Extra connections allowed under load |
| `FAVORITES_SESSION_SECRET` | 32 characters or more | none | Signs the session cookie. **Required outside `Development`**, where a random one is made at start (sessions then end on restart). Every replica must share the same value. Never printed |
| `FAVORITES_SESSION_DAYS` | 1 to 365 | `14` | Lifetime of the session cookie; it is renewed on use after half of it has passed |

## Layout

```
src/favorites_api/
  app.py        application factory
  config.py     typed settings
  api/          HTTP layer: routes (cookies and CSRF will live here)
  application/  ports (what the use cases need from persistence); use cases come with the endpoints
  domain/       resource types and the Favorite model, with no framework in them
  infrastructure/persistence/
                tables.py (maps the existing tables, never creates them), connection.py, repositories.py
tests/          unit tests; integration/ needs SQL Server
```

Decisions behind the stack: `specs/001-favorites-python-api/research.md`.
