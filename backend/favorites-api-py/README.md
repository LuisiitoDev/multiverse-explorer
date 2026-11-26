# Favorites API (FastAPI)

Python service that is replacing the .NET `backend/src/Favorites.Api`. Epic: #132. It keeps the same contract (URLs,
payloads, status codes, cookie and header names) so the web app does not change. Today it only has `GET /health`; the
favorites endpoints, session, CSRF and sign-in arrive story by story (#135 to #140).

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

## Settings

Read from environment variables. A missing or invalid value stops the service; nothing has a secret as a default.

| Variable | Values | Default | Effect |
|---|---|---|---|
| `FAVORITES_ENVIRONMENT` | `Development`, `Staging`, `Production` | `Production` | API documentation (`/docs`, `/openapi.json`) is served only in `Development` |
| `ConnectionStrings__FavoritesDb` | ADO.NET connection string | none | Same variable and format as the .NET service, so one configuration serves both. Needed by whatever opens the database; the service stops with a clear message if it is missing or has a keyword other than `Server`, `Database`, `User Id`, `Password`, `Encrypt`, `TrustServerCertificate`. Never printed |
| `FAVORITES_DB_POOL_SIZE` | 1 to 100 | `20` | Connections kept open. FastAPI runs `def` routes in a thread pool (documented default 40 threads), so 20 plus the overflow gives each thread a connection |
| `FAVORITES_DB_MAX_OVERFLOW` | 0 to 100 | `20` | Extra connections allowed under load |

## Layout

```
src/favorites_api/
  app.py        application factory
  config.py     typed settings
  api/          HTTP layer (routes). Application, domain and infrastructure layers are added by the stories that need them.
tests/
```

Decisions behind the stack: `specs/001-favorites-python-api/research.md`.
