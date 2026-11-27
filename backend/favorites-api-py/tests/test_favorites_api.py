"""``/api/favorites`` over HTTP, with in-memory repositories.

The sign-in route is a test helper (the real sign-in is #139). It is added inside the test, so the
service cannot expose it.
"""

from datetime import datetime
from uuid import UUID, uuid4

import pytest
import sqlalchemy as sa
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from pydantic import SecretStr

from favorites_api import app as app_module
from favorites_api.api.csrf import COOKIE_NAME
from favorites_api.api.session import start_session
from favorites_api.app import create_app
from favorites_api.application.favorites import FavoriteService
from favorites_api.config import ConfigurationError, Settings
from tests.fakes import InMemoryFavorites, InMemoryUsers

NOW = datetime(2026, 1, 2, 3, 4, 5)
URL = "/api/favorites"
PROBLEM = "application/problem+json"


def make_app(
    environment: str = "Production",
    known: tuple[UUID, ...] = (),
    store: InMemoryFavorites | None = None,
) -> FastAPI:
    settings = Settings(environment=environment, session_secret=SecretStr("s" * 32))
    service = FavoriteService(
        store or InMemoryFavorites(), InMemoryUsers(*known), clock=lambda: NOW
    )
    app = create_app(settings, favorites=service)

    @app.post("/test/sign-in/{user_id}")
    def sign_in(request: Request, user_id: str) -> None:
        start_session(request, UUID(user_id))

    return app


ME = uuid4()


@pytest.fixture
def store() -> InMemoryFavorites:
    return InMemoryFavorites()


@pytest.fixture
def client(store: InMemoryFavorites) -> TestClient:
    return TestClient(make_app(known=(ME,), store=store), base_url="https://testserver")


@pytest.fixture
def me(client: TestClient) -> TestClient:
    """A client signed in as ME that already holds its CSRF token."""
    client.post(f"/test/sign-in/{ME}")
    client.get(URL)
    return client


def seed(store: InMemoryFavorites, kind: str, resource_id: int) -> None:
    store.try_add(ME, kind, resource_id, NOW)


def assert_problem(response, status: int, detail: str | None = None) -> None:  # type: ignore[no-untyped-def]
    assert response.status_code == status
    assert response.headers["content-type"].startswith(PROBLEM)
    body = response.json()
    assert body["status"] == status
    if detail is not None:
        assert body["detail"] == detail


# --- sign-in --------------------------------------------------------------------------------


def test_listing_needs_a_session(client: TestClient) -> None:
    assert client.get(URL).status_code == 401


# --- GET ------------------------------------------------------------------------------------


def test_list_is_empty_at_first(me: TestClient) -> None:
    response = me.get(URL)

    assert response.status_code == 200
    assert response.json() == []


def test_list_uses_the_camel_case_fields_of_the_contract(
    me: TestClient, store: InMemoryFavorites
) -> None:
    seed(store, "episode", 5)

    [item] = me.get(URL).json()

    assert item["createAt"].startswith("2026-01-02T03:04:05")
    assert set(item) == {"id", "userId", "resourceType", "resourceId", "createAt"}
    assert (item["userId"], item["resourceType"], item["resourceId"]) == (str(ME), "episode", 5)


def test_list_filters_by_type_in_any_case(me: TestClient, store: InMemoryFavorites) -> None:
    seed(store, "character", 1)
    seed(store, "episode", 2)

    assert [f["resourceId"] for f in me.get(URL, params={"type": "EPISODE"}).json()] == [2]
    assert len(me.get(URL, params={"type": " "}).json()) == 2


def test_list_with_an_unknown_type_is_a_400_problem(me: TestClient) -> None:
    response = me.get(URL, params={"type": "planet"})

    assert_problem(response, 400, "type must be one of: character, episode, location.")


def test_a_get_hands_out_the_csrf_cookie(client: TestClient) -> None:
    client.post(f"/test/sign-in/{ME}")

    assert COOKIE_NAME in client.get(URL).cookies


# --- OpenAPI and start-up -------------------------------------------------------------------


def test_openapi_lists_the_operation_with_the_net_name_and_statuses() -> None:
    schema = TestClient(make_app("Development")).get("/openapi.json").json()
    operations = {
        (method.upper(), path): (op["operationId"], sorted(op["responses"]))
        for path, item in schema["paths"].items()
        if path.startswith(URL)
        for method, op in item.items()
    }

    assert operations == {("GET", URL): ("GetFavorites", ["200", "400"])}


def test_the_service_refuses_to_start_without_a_database() -> None:
    app = create_app(Settings(environment="Production", session_secret=SecretStr("s" * 32)))

    with pytest.raises(ConfigurationError, match="ConnectionStrings__FavoritesDb"), TestClient(app):
        pass  # pragma: no cover


def test_the_use_cases_are_built_from_the_connection_string(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(app_module, "create_db_engine", lambda _: sa.create_engine("sqlite://"))
    settings = Settings(
        environment="Production",
        session_secret=SecretStr("s" * 32),
        ConnectionStrings__FavoritesDb=SecretStr("Server=x;Database=y;User Id=u;Password=p"),
    )

    app = create_app(settings)

    assert isinstance(app.state.favorites, FavoriteService)
