from fastapi.testclient import TestClient
from pydantic import SecretStr

from favorites_api.app import create_app
from favorites_api.config import Environment, Settings


def client(environment: Environment) -> TestClient:
    settings = Settings(environment=environment, session_secret=SecretStr("s" * 32))
    return TestClient(create_app(settings))


def test_health_answers_200_with_status_ok() -> None:
    response = client("Production").get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_documentation_is_not_served_in_production() -> None:
    api = client("Production")

    assert api.get("/docs").status_code == 404
    assert api.get("/openapi.json").status_code == 404


def test_documentation_is_not_served_in_staging() -> None:
    api = client("Staging")

    assert api.get("/docs").status_code == 404
    assert api.get("/openapi.json").status_code == 404


def test_documentation_is_served_in_development() -> None:
    api = client("Development")

    assert api.get("/docs").status_code == 200
    contract = api.get("/openapi.json")
    assert contract.status_code == 200
    operation = contract.json()["paths"]["/health"]["get"]
    assert operation["operationId"] == "GetHealth"
