"""Errors as problem documents (RFC 9457, ``application/problem+json``).

The shape is what ASP.NET's ``Results.Problem`` gives: ``type``, ``title``, ``status``, ``detail``.

Type and title for 400, 404 and 409 follow ASP.NET's defaults (RFC 9110 sections). They are the
likely values, not checked ones: the .NET tests assert only the content type and the ``status``,
and the running service could not show a 400 body without its database (the anti-forgery keys).
"""

from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

_RFC9110 = "https://tools.ietf.org/html/rfc9110#section-"
_TYPES = {400: "15.5.1", 404: "15.5.5", 409: "15.5.10"}


class ProblemError(Exception):
    """Raise it anywhere in a request to answer with a problem document."""

    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def problem_response(status_code: int, detail: str) -> JSONResponse:
    body: dict[str, object] = {
        "title": HTTPStatus(status_code).phrase,
        "status": status_code,
        "detail": detail,
    }
    if status_code in _TYPES:
        body = {"type": _RFC9110 + _TYPES[status_code], **body}
    return JSONResponse(body, status_code=status_code, media_type="application/problem+json")


def install_problem_handler(app: FastAPI) -> None:
    @app.exception_handler(ProblemError)
    def handle(_: Request, error: ProblemError) -> JSONResponse:
        return problem_response(error.status_code, error.detail)
