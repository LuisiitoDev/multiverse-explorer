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
from favorites_api.api.csrf import COOKIE_NAME, HEADER_NAME
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


def change(client: TestClient) -> dict[str, str]:
    return {HEADER_NAME: client.cookies[COOKIE_NAME]}


def create(client: TestClient, kind: str = "character", resource_id: int = 1) -> dict[str, object]:
    response = client.post(
        URL, json={"resourceType": kind, "resourceId": resource_id}, headers=change(client)
    )
    assert response.status_code == 201, response.text
    body: dict[str, object] = response.json()
    return body


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


def test_every_operation_needs_a_session(client: TestClient) -> None:
    assert client.get(URL).status_code == 401
    assert client.post(URL, json={"resourceType": "character", "resourceId": 1}).status_code == 401
    assert client.delete(f"{URL}/1").status_code == 401


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


# --- POST -----------------------------------------------------------------------------------


def test_create_answers_201_with_a_location_and_the_favorite(me: TestClient) -> None:
    response = me.post(URL, json={"resourceType": "Character", "resourceId": 7}, headers=change(me))

    body = response.json()
    assert response.status_code == 201
    assert response.headers["location"] == f"{URL}/{body['id']}"
    assert response.headers["content-type"] == "application/json"
    assert (body["resourceType"], body["resourceId"], body["userId"]) == ("character", 7, str(ME))
    assert body["createAt"].startswith("2026-01-02T03:04:05")


def test_create_ignores_a_user_id_sent_in_the_body(me: TestClient) -> None:
    response = me.post(
        URL,
        json={"resourceType": "character", "resourceId": 1, "userId": str(uuid4())},
        headers=change(me),
    )

    assert response.json()["userId"] == str(ME)


def test_create_needs_the_csrf_header(me: TestClient) -> None:
    response = me.post(URL, json={"resourceType": "character", "resourceId": 1})

    assert_problem(response, 400, "Invalid or missing CSRF token.")


def test_create_twice_is_a_409_problem(me: TestClient) -> None:
    create(me, "character", 1)

    response = me.post(URL, json={"resourceType": "character", "resourceId": 1}, headers=change(me))

    assert_problem(response, 409, "The resource is already in the user's favorites.")


def test_create_for_a_user_that_does_not_exist_is_404(client: TestClient) -> None:
    stranger = uuid4()
    client.post(f"/test/sign-in/{stranger}")
    client.get(URL)

    response = client.post(
        URL, json={"resourceType": "character", "resourceId": 1}, headers=change(client)
    )

    assert_problem(response, 404, f"User '{stranger}' was not found.")


@pytest.mark.parametrize(
    ("body", "detail"),
    [
        (
            {"resourceType": "planet", "resourceId": 1},
            "resourceType must be one of: character, episode, location.",
        ),
        ({"resourceType": "character", "resourceId": 0}, "resourceId must be greater than zero."),
        ({"resourceType": "character", "resourceId": -4}, "resourceId must be greater than zero."),
        (
            {},
            "resourceType is required. resourceId must be greater than zero.",
        ),
        ({"resourceType": "", "resourceId": 1}, "resourceType is required."),
    ],
)
def test_create_with_invalid_data_is_a_400_problem(
    me: TestClient, body: dict[str, object], detail: str
) -> None:
    assert_problem(me.post(URL, json=body, headers=change(me)), 400, detail)


@pytest.mark.parametrize(
    "body",
    [
        {"resourceType": "character", "resourceId": "5"},  # a number sent as text
        {"resourceType": "character", "resourceId": 1.5},
        {"resourceType": "character", "resourceId": 2**31},  # does not fit an int32
        {"resourceType": 7, "resourceId": 1},
        {"resourceType": "character", "resourceId": True},
    ],
)
def test_create_with_the_wrong_json_types_is_a_400_not_a_422(
    me: TestClient, body: dict[str, object]
) -> None:
    assert_problem(me.post(URL, json=body, headers=change(me)), 400)


def test_create_with_a_body_that_is_not_json_is_a_400_problem(me: TestClient) -> None:
    headers = {**change(me), "Content-Type": "application/json"}

    assert_problem(me.post(URL, content="{not json", headers=headers), 400)


def test_a_problem_never_echoes_the_submitted_value(me: TestClient) -> None:
    response = me.post(
        URL, json={"resourceType": "character", "resourceId": "secret-value"}, headers=change(me)
    )

    assert "secret-value" not in response.text


# --- DELETE ---------------------------------------------------------------------------------


def test_delete_removes_my_favorite_with_a_204_and_no_body(me: TestClient) -> None:
    favorite_id = create(me)["id"]

    response = me.delete(f"{URL}/{favorite_id}", headers=change(me))

    assert response.status_code == 204
    assert response.content == b""
    assert me.get(URL).json() == []


def test_delete_needs_the_csrf_header(me: TestClient) -> None:
    favorite_id = create(me)["id"]

    assert_problem(me.delete(f"{URL}/{favorite_id}"), 400, "Invalid or missing CSRF token.")
    assert len(me.get(URL).json()) == 1


def test_delete_of_a_favorite_that_is_not_there_is_404(me: TestClient) -> None:
    assert_problem(me.delete(f"{URL}/99", headers=change(me)), 404, "Favorite '99' was not found.")


def test_delete_cannot_remove_someone_elses_favorite(client: TestClient) -> None:
    other = uuid4()
    app = make_app(known=(ME, other))
    mine = TestClient(app, base_url="https://testserver")
    theirs = TestClient(app, base_url="https://testserver")
    for browser, user in ((mine, ME), (theirs, other)):
        browser.post(f"/test/sign-in/{user}")
        browser.get(URL)
    favorite_id = create(theirs)["id"]

    assert_problem(mine.delete(f"{URL}/{favorite_id}", headers=change(mine)), 404)
    assert len(theirs.get(URL).json()) == 1


@pytest.mark.parametrize("favorite_id", ["0", "-1"])
def test_delete_with_an_id_that_is_not_positive_is_a_400_problem(
    me: TestClient, favorite_id: str
) -> None:
    response = me.delete(f"{URL}/{favorite_id}", headers=change(me))

    assert_problem(response, 400, "id must be greater than zero.")


@pytest.mark.parametrize("favorite_id", ["abc", "1.5", "1234567890123456789"])
def test_delete_with_an_id_that_is_not_a_number_does_not_match_the_route(
    me: TestClient, favorite_id: str
) -> None:
    # ASP.NET's {id:long} constraint: the route does not match, so the answer is a plain 404.
    assert me.delete(f"{URL}/{favorite_id}", headers=change(me)).status_code == 404


# --- OpenAPI and start-up -------------------------------------------------------------------


def test_openapi_lists_the_three_operations_with_the_net_names_and_statuses() -> None:
    schema = TestClient(make_app("Development")).get("/openapi.json").json()
    operations = {
        (method.upper(), path): (op["operationId"], sorted(op["responses"]))
        for path, item in schema["paths"].items()
        if path.startswith(URL)
        for method, op in item.items()
    }

    assert operations == {
        ("GET", URL): ("GetFavorites", ["200", "400"]),
        ("POST", URL): ("CreateFavorite", ["201", "400", "404", "409"]),
        ("DELETE", f"{URL}/{{id}}"): ("DeleteFavorite", ["204", "400", "404"]),
    }


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
