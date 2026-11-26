import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from favorites_api.api.problems import ProblemError, install_problem_handler, problem_response


@pytest.mark.parametrize(
    ("status", "title", "section"),
    [(400, "Bad Request", "15.5.1"), (404, "Not Found", "15.5.5"), (409, "Conflict", "15.5.10")],
)
def test_a_problem_has_type_title_status_and_detail(status: int, title: str, section: str) -> None:
    response = problem_response(status, "Something is wrong.")

    assert response.status_code == status
    assert response.media_type == "application/problem+json"
    assert (
        response.body
        == (
            f'{{"type":"https://tools.ietf.org/html/rfc9110#section-{section}",'
            f'"title":"{title}","status":{status},"detail":"Something is wrong."}}'
        ).encode()
    )


def test_a_status_without_a_known_type_still_has_title_status_and_detail() -> None:
    response = problem_response(403, "Nope.")

    assert b'"title":"Forbidden"' in response.body
    assert b'"type"' not in response.body


def test_a_raised_problem_becomes_the_answer() -> None:
    app = FastAPI()
    install_problem_handler(app)

    @app.get("/boom")
    def boom() -> None:
        raise ProblemError(409, "Already there.")

    response = TestClient(app).get("/boom")

    assert response.status_code == 409
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["detail"] == "Already there."
