"""CSRF protection by a signed double-submit token.

The web app reads the cookie ``XSRF-TOKEN`` and sends its value back in the header
``X-CSRF-TOKEN`` on every change (POST, DELETE), as it does with the .NET service. The token is
``<random>.<HMAC of the random value and the signed-in user>``, so a site that can write cookies
cannot invent a valid pair, and a token made for one user does not work for another.

This replaces ASP.NET's anti-forgery, whose tokens are encrypted with keys kept in the database and
cannot be read here. The names, the cookie attributes and the 400 answer are the same.
"""

import hashlib
import hmac
import secrets
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

from favorites_api.api.problems import ProblemError
from favorites_api.config import Settings

COOKIE_NAME = "XSRF-TOKEN"
HEADER_NAME = "X-CSRF-TOKEN"
MESSAGE = "Invalid or missing CSRF token."


def _mac(settings: Settings, nonce: str, user: str) -> str:
    # A key of its own, derived from the session secret, so the two uses never share a key.
    key = hashlib.sha256(b"csrf:" + settings.session_key().encode()).digest()
    return hmac.new(key, f"{nonce}:{user}".encode(), hashlib.sha256).hexdigest()


def issue_token(settings: Settings, user: str) -> str:
    nonce = secrets.token_urlsafe(24)
    return f"{nonce}.{_mac(settings, nonce, user)}"


def is_valid_token(settings: Settings, token: str, user: str) -> bool:
    nonce, dot, mac = token.partition(".")
    return bool(nonce) and bool(dot) and hmac.compare_digest(mac, _mac(settings, nonce, user))


def _signed_in_user(request: Request) -> str:
    return str(request.session.get("uid", ""))


def require_csrf(request: Request) -> None:
    """Dependency for routes that change data. List it after the sign-in dependency, so a request
    without a session is a 401 before it is a 400, as in the .NET service."""
    settings: Settings = request.app.state.settings
    header = request.headers.get(HEADER_NAME)
    cookie = request.cookies.get(COOKIE_NAME)
    if (
        not header
        or not cookie
        or not hmac.compare_digest(header, cookie)
        or not is_valid_token(settings, header, _signed_in_user(request))
    ):
        raise ProblemError(400, MESSAGE)


def _under_api(path: str) -> bool:
    return path == "/api" or path.startswith("/api/")


def install_csrf_cookie(app: FastAPI, settings: Settings) -> None:
    """Hand a fresh token to the browser on every GET under /api. Add it BEFORE the session
    middleware: middleware added later wraps it, and it needs the session to know the user."""

    @app.middleware("http")
    async def publish_token(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        if request.method == "GET" and _under_api(request.url.path):
            response.set_cookie(
                COOKIE_NAME,
                issue_token(settings, _signed_in_user(request)),
                secure=True,
                httponly=False,  # the web app must be able to read it
                samesite="lax",
                path="/",
            )
        return response
