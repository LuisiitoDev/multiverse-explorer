"""The session cookie and the dependency that tells who is signed in.

Same contract as the .NET service: a cookie named ``__Host-favorites.session``, hidden from page
scripts, sent only over HTTPS and only for same-site navigation, signed so it cannot be forged, and
renewed on use. It holds the user id and nothing secret: the cookie is signed, not encrypted, so the
client can read it.
"""

import time
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, HTTPException, Request
from starlette.middleware.sessions import SessionMiddleware

from favorites_api.config import Settings

SESSION_COOKIE = "__Host-favorites.session"
_USER_KEY = "uid"
_ISSUED_KEY = "iat"
_SECONDS_PER_DAY = 86_400


def install_session(app: FastAPI, settings: Settings) -> None:
    """Add the signed cookie. Starlette enforces the lifetime when it reads the cookie."""
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_key(),
        session_cookie=SESSION_COOKIE,
        max_age=settings.session_days * _SECONDS_PER_DAY,
        same_site="lax",
        https_only=True,
    )


def start_session(request: Request, user_id: UUID) -> None:
    """Sign a user in. Anything already in the session is dropped, so a value planted before the
    sign-in (for example an OAuth state) cannot carry over (session fixation)."""
    request.session.clear()
    request.session[_USER_KEY] = str(user_id)
    request.session[_ISSUED_KEY] = int(time.time())


def end_session(request: Request) -> None:
    request.session.clear()


def current_user_id(request: Request) -> UUID:
    """The signed-in user. Without a valid session the answer is 401, never a redirect."""
    session = request.session
    try:
        user_id = UUID(str(session[_USER_KEY]))
    except (KeyError, ValueError):
        raise HTTPException(status_code=401) from None

    # Sliding expiry, as ASP.NET does it: once half of the lifetime has passed, a request renews the
    # cookie. Writing to the session makes Starlette sign it again, with a new timestamp.
    settings: Settings = request.app.state.settings
    half_life = settings.session_days * _SECONDS_PER_DAY // 2
    now = int(time.time())
    if now - int(session.get(_ISSUED_KEY, 0)) > half_life:
        session[_ISSUED_KEY] = now
    return user_id


CurrentUserId = Annotated[UUID, Depends(current_user_id)]
