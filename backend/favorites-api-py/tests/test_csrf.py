from uuid import UUID, uuid4

import pytest
from fastapi import Depends, FastAPI, Request
from fastapi.testclient import TestClient
from pydantic import SecretStr

from favorites_api.api.csrf import COOKIE_NAME, HEADER_NAME, MESSAGE, issue_token, require_csrf
from favorites_api.api.session import SESSION_COOKIE, current_user_id, start_session
from favorites_api.app import create_app
from favorites_api.config import Settings

SETTINGS = Settings(environment="Production", session_secret=SecretStr("s" * 32))


def make_app() -> FastAPI:
    app = create_app(SETTINGS)

    @app.post("/test/sign-in/{user_id}")
    def sign_in(request: Request, user_id: str) -> None:
        start_session(request, UUID(user_id))

    @app.get("/api/test/read")
    def read() -> dict[str, str]:
        return {}

    @app.get("/other/read")
    def elsewhere() -> dict[str, str]:
        return {}

    @app.post("/api/test/change", dependencies=[Depends(current_user_id), Depends(require_csrf)])
    def change() -> dict[str, str]:
        return {"changed": "yes"}

    @app.delete("/api/test/change", dependencies=[Depends(current_user_id), Depends(require_csrf)])
    def remove() -> dict[str, str]:
        return {"removed": "yes"}

    return app


@pytest.fixture
def client() -> TestClient:
    return TestClient(make_app(), base_url="https://testserver")


def signed_in(client: TestClient) -> str:
    """Sign in, read once so the browser gets its token, and return that token."""
    client.post(f"/test/sign-in/{uuid4()}")
    client.get("/api/test/read")
    return client.cookies[COOKIE_NAME]


def test_a_get_under_api_hands_out_a_readable_cookie(client: TestClient) -> None:
    header = client.get("/api/test/read").headers["set-cookie"].lower()

    assert header.startswith(f"{COOKIE_NAME.lower()}=")
    assert "secure" in header
    assert "samesite=lax" in header
    assert "path=/" in header
    assert "httponly" not in header  # the web app has to read it


def test_no_cookie_outside_api_or_on_a_post(client: TestClient) -> None:
    assert COOKIE_NAME not in client.get("/other/read").cookies
    assert COOKIE_NAME not in client.get("/health").cookies
    token = signed_in(client)
    after = client.post("/api/test/change", headers={HEADER_NAME: token})
    assert "set-cookie" not in after.headers


def test_a_change_with_the_right_header_goes_through(client: TestClient) -> None:
    token = signed_in(client)

    response = client.post("/api/test/change", headers={HEADER_NAME: token})

    assert response.status_code == 200
    assert response.json() == {"changed": "yes"}


def test_delete_needs_the_token_too(client: TestClient) -> None:
    token = signed_in(client)

    assert client.delete("/api/test/change").status_code == 400
    assert client.delete("/api/test/change", headers={HEADER_NAME: token}).status_code == 200


def test_a_missing_header_is_a_400_problem_with_the_message(client: TestClient) -> None:
    signed_in(client)

    response = client.post("/api/test/change")

    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/problem+json")
    body = response.json()
    assert (body["status"], body["detail"]) == (400, MESSAGE)
    assert MESSAGE == "Invalid or missing CSRF token."


def test_a_wrong_header_is_refused(client: TestClient) -> None:
    signed_in(client)

    assert client.post("/api/test/change", headers={HEADER_NAME: "wrong"}).status_code == 400


def test_a_header_that_differs_from_the_cookie_is_refused(client: TestClient) -> None:
    token = signed_in(client)
    other = issue_token(SETTINGS, "someone-else")

    assert other != token
    assert client.post("/api/test/change", headers={HEADER_NAME: other}).status_code == 400


def test_a_pair_the_attacker_made_up_is_refused(client: TestClient) -> None:
    client.post(f"/test/sign-in/{uuid4()}")
    session = client.cookies[SESSION_COOKIE]
    client.cookies.clear()
    forged = "attacker.not-a-real-mac"

    response = client.post(
        "/api/test/change",
        headers={
            "Cookie": f"{SESSION_COOKIE}={session}; {COOKIE_NAME}={forged}",
            HEADER_NAME: forged,
        },
    )

    assert response.status_code == 400


def test_a_token_made_for_one_user_does_not_work_for_another(client: TestClient) -> None:
    token_of_a = signed_in(client)
    client.post(f"/test/sign-in/{uuid4()}")  # the same browser now signs in as someone else

    response = client.post("/api/test/change", headers={HEADER_NAME: token_of_a})

    assert response.status_code == 400


def test_without_a_session_the_answer_is_401_before_the_csrf_check(client: TestClient) -> None:
    assert client.post("/api/test/change").status_code == 401
