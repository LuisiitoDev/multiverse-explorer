"""The session cookie and the current-user dependency.

The sign-in routes here are test helpers, not part of the service (the real sign-in arrives with
the OAuth story). They are added to the app inside the test, so production cannot reach them.
"""

import base64
import json
import time
from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from pydantic import SecretStr

from favorites_api.api.session import SESSION_COOKIE, CurrentUserId, end_session, start_session
from favorites_api.app import create_app
from favorites_api.config import Settings

DAY = 86_400


def make_app(days: int = 14, secret: str = "s" * 32) -> FastAPI:
    settings = Settings(
        environment="Production", session_secret=SecretStr(secret), session_days=days
    )
    app = create_app(settings)

    @app.post("/test/sign-in/{user_id}")
    def sign_in(request: Request, user_id: str) -> None:
        start_session(request, UUID(user_id))

    @app.post("/test/sign-in-raw/{value}")
    def sign_in_raw(request: Request, value: str) -> None:
        request.session["uid"] = value

    @app.post("/test/plant/{value}")
    def plant(request: Request, value: str) -> None:
        request.session["oauth_state"] = value

    @app.post("/test/sign-out")
    def sign_out(request: Request) -> None:
        end_session(request)

    @app.get("/test/me")
    def me(user_id: CurrentUserId) -> dict[str, str]:
        return {"id": str(user_id)}

    @app.get("/test/session")
    def inspect(request: Request) -> dict[str, object]:
        return dict(request.session)

    return app


@pytest.fixture
def client() -> TestClient:
    return TestClient(make_app(), base_url="https://testserver")  # https: the cookie is Secure


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> Iterator["Clock"]:
    fake = Clock()
    monkeypatch.setattr(time, "time", fake)
    yield fake


class Clock:
    """Moves time forward for the cookie signer and for the renewal check alike."""

    def __init__(self) -> None:
        self.offset = 0.0
        self._real = time.time

    def __call__(self) -> float:
        return self._real() + self.offset

    def advance(self, days: float) -> None:
        self.offset += days * DAY


def test_no_cookie_is_unauthorized_not_a_redirect(client: TestClient) -> None:
    response = client.get("/test/me", follow_redirects=False)

    assert response.status_code == 401


def test_a_signed_in_user_is_identified(client: TestClient) -> None:
    user = uuid4()
    client.post(f"/test/sign-in/{user}")

    response = client.get("/test/me")

    assert response.status_code == 200
    assert response.json() == {"id": str(user)}


def test_the_cookie_has_the_attributes_the_dotnet_service_sets(client: TestClient) -> None:
    response = client.post(f"/test/sign-in/{uuid4()}")

    header = response.headers["set-cookie"].lower()
    assert header.startswith(f"{SESSION_COOKIE.lower()}=")
    assert "httponly" in header
    assert "secure" in header
    assert "samesite=lax" in header
    assert "path=/" in header
    assert f"max-age={14 * DAY}" in header
    assert "domain" not in header  # a __Host- cookie must not carry one


def as_header(value: str) -> dict[str, str]:
    """Send a cookie by hand. The test client's jar would also keep the genuine one."""
    return {"Cookie": f"{SESSION_COOKIE}={value}"}


def forged_with(value: str, **changes: str) -> str:
    """The cookie with its payload changed and the signature left as it was."""
    payload, *rest = value.split(".")
    data = json.loads(base64.b64decode(payload))
    data.update(changes)
    return ".".join([base64.b64encode(json.dumps(data).encode()).decode(), *rest])


def test_a_cookie_with_another_user_id_but_the_same_signature_is_unauthorized(
    client: TestClient,
) -> None:
    client.post(f"/test/sign-in/{uuid4()}")
    genuine = client.cookies[SESSION_COOKIE]
    client.cookies.clear()

    assert client.get("/test/me", headers=as_header(genuine)).status_code == 200  # the control
    forged = forged_with(genuine, uid=str(uuid4()))
    assert client.get("/test/me", headers=as_header(forged)).status_code == 401


def test_a_cookie_with_a_damaged_signature_is_unauthorized(client: TestClient) -> None:
    client.post(f"/test/sign-in/{uuid4()}")
    *head, signature = client.cookies[SESSION_COOKIE].split(".")
    client.cookies.clear()
    damaged = ".".join([*head, ("A" if signature[0] != "A" else "B") + signature[1:]])

    assert client.get("/test/me", headers=as_header(damaged)).status_code == 401


def test_a_cookie_made_with_another_secret_is_unauthorized(client: TestClient) -> None:
    client.post(f"/test/sign-in/{uuid4()}")
    stranger = TestClient(make_app(secret="o" * 32), base_url="https://testserver")
    stranger.cookies.set(SESSION_COOKIE, client.cookies[SESSION_COOKIE])

    assert client.get("/test/me").status_code == 200  # the cookie is good for the app that made it
    assert stranger.get("/test/me").status_code == 401


def test_an_expired_cookie_is_unauthorized(client: TestClient, clock: Clock) -> None:
    client.post(f"/test/sign-in/{uuid4()}")

    clock.advance(days=15)

    assert client.get("/test/me").status_code == 401


@pytest.mark.parametrize("value", ["not-a-guid", "", "123"])
def test_a_session_without_a_valid_user_id_is_unauthorized(client: TestClient, value: str) -> None:
    client.post(f"/test/sign-in-raw/{value or 'x'}")

    assert client.get("/test/me").status_code == 401


def test_the_cookie_is_not_renewed_in_the_first_half_of_its_life(
    client: TestClient, clock: Clock
) -> None:
    client.post(f"/test/sign-in/{uuid4()}")

    clock.advance(days=6)
    response = client.get("/test/me")

    assert response.status_code == 200
    assert "set-cookie" not in response.headers


def test_the_cookie_is_renewed_after_half_of_its_life_so_it_slides(
    client: TestClient, clock: Clock
) -> None:
    client.post(f"/test/sign-in/{uuid4()}")

    clock.advance(days=8)
    renewed = client.get("/test/me")

    assert renewed.status_code == 200
    assert f"max-age={14 * DAY}" in renewed.headers["set-cookie"].lower()
    # 16 days after sign-in: past the original 14, still alive because it was renewed on day 8
    clock.advance(days=8)
    assert client.get("/test/me").status_code == 200


def test_signing_in_drops_what_was_in_the_session_before(client: TestClient) -> None:
    client.post("/test/plant/attacker-value")
    client.post(f"/test/sign-in/{uuid4()}")

    keys = set(client.get("/test/session").json())

    assert keys == {"uid", "iat"}


def test_signing_out_ends_the_session(client: TestClient) -> None:
    client.post(f"/test/sign-in/{uuid4()}")
    client.post("/test/sign-out")

    assert client.get("/test/me").status_code == 401
