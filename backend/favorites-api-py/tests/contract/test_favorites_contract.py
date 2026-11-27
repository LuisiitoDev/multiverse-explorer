"""The ``/api/favorites`` contract against the OpenAPI document of the .NET service.

``dotnet-openapi.json`` is a snapshot of ``/openapi/v1.json`` from the .NET service in Development.
Regenerate it while the .NET service runs (``dotnet run`` in ``backend/src/Favorites.Api`` with
``ASPNETCORE_URLS=http://localhost:5299``):

    curl -s http://localhost:5299/openapi/v1.json > tests/contract/dotnet-openapi.json

Only the favorites operations and the schemas they use are compared: paths, methods, operation
ids, parameters, request and response media types and schemas, and the properties of each schema
(type, format and whether required). Every difference that is left is listed in ``ACCEPTED``. A new
difference fails the test, and so does an accepted one that has gone away.
"""

import json
from pathlib import Path
from typing import Any

from pydantic import SecretStr

from favorites_api.app import create_app
from favorites_api.application.favorites import FavoriteService
from favorites_api.config import Settings
from tests.fakes import InMemoryFavorites, InMemoryUsers

SNAPSHOT = Path(__file__).with_name("dotnet-openapi.json")
PREFIX = "/api/favorites"
SCHEMAS = ("FavoriteResponse", "CreateFavoriteRequest", "ProblemDetails")
ABSENT = "<absent>"

# The differences that remain on purpose. Each one is a decision, not a bug to fix later.
ACCEPTED: frozenset[str] = frozenset(
    {
        # Python declares no int64 or int32 format. The ranges are enforced in the code instead:
        # resourceId is at most 2147483647 (CreateFavoriteRequest), and the id is at most 18
        # digits (the route), so the value always fits the column.
        "CreateFavoriteRequest.resourceId: .NET='integer (int32)', Python='integer'",
        "DELETE /api/favorites/{id}.parameter path id.schema: "
        ".NET='integer (int64)', Python='integer'",
        "FavoriteResponse.id: .NET='integer (int64)', Python='integer'",
        "FavoriteResponse.resourceId: .NET='integer (int32)', Python='integer'",
        "ProblemDetails.status: .NET='integer (int32)', Python='integer'",
        # A missing resourceType or resourceId is not a schema error in Python: it takes the
        # value .NET takes (null, 0), so the 400 message is the same, and the schema does not mark
        # them required.
        "CreateFavoriteRequest.required: .NET=['resourceId', 'resourceType'], Python=[]",
        # Python always sends title, status and detail, and never sends instance. .NET declares
        # nothing as required.
        "ProblemDetails.instance: .NET='string', Python='<absent>'",
        "ProblemDetails.required: .NET=[], Python=['detail', 'status', 'title']",
    }
)


def _leaf(schema: dict[str, Any]) -> str:
    """The type and format of a schema, the way both documents are compared. Nullability is not
    part of it: ``nullable`` (.NET) and ``anyOf`` with null (Python) say the same thing."""
    if "$ref" in schema:
        ref: str = schema["$ref"]
        return "ref " + ref.rsplit("/", 1)[-1]
    if "anyOf" in schema:
        options = [option for option in schema["anyOf"] if option != {"type": "null"}]
        return _leaf(options[0]) if len(options) == 1 else "anyOf"
    if schema.get("type") == "array":
        return "array of " + _leaf(schema["items"])
    kind: str = schema.get("type", "any")
    fmt = schema.get("format")
    return kind + (f" ({fmt})" if fmt else "")


def _facts(document: dict[str, Any]) -> dict[str, object]:
    """Every compared fact of the document, under a flat key such as ``GET /api/favorites.200``."""
    facts: dict[str, object] = {}
    for path, item in document["paths"].items():
        if not path.startswith(PREFIX):
            continue
        for method, operation in item.items():
            base = f"{method.upper()} {path}"
            facts[f"{base}.operationId"] = operation["operationId"]
            for parameter in operation.get("parameters", []):
                key = f"{base}.parameter {parameter['in']} {parameter['name']}"
                facts[f"{key}.required"] = bool(parameter.get("required", False))
                facts[f"{key}.schema"] = _leaf(parameter["schema"])
            body = operation.get("requestBody", {}).get("content", {})
            facts[f"{base}.request"] = sorted(body)
            for spec in body.values():
                facts[f"{base}.request.schema"] = _leaf(spec["schema"])
            for status, response in operation["responses"].items():
                content = response.get("content", {})
                facts[f"{base}.{status}.media"] = sorted(content)
                for spec in content.values():
                    facts[f"{base}.{status}.schema"] = _leaf(spec["schema"])

    schemas = document.get("components", {}).get("schemas", {})
    for name in SCHEMAS:
        schema = schemas.get(name, {})
        facts[f"{name}.exists"] = name in schemas
        facts[f"{name}.required"] = sorted(schema.get("required", []))
        for prop, spec in schema.get("properties", {}).items():
            facts[f"{name}.{prop}"] = _leaf(spec)
    return facts


def _python_document() -> dict[str, Any]:
    settings = Settings(environment="Development", session_secret=SecretStr("s" * 32))
    service = FavoriteService(InMemoryFavorites(), InMemoryUsers())
    return create_app(settings, favorites=service).openapi()


def _differences() -> set[str]:
    dotnet = _facts(json.loads(SNAPSHOT.read_text(encoding="utf-8")))
    python = _facts(_python_document())
    found: set[str] = set()
    for key in dotnet.keys() | python.keys():
        expected, actual = dotnet.get(key, ABSENT), python.get(key, ABSENT)
        if expected != actual:
            found.add(f"{key}: .NET={expected!r}, Python={actual!r}")
    return found


def test_the_snapshot_covers_the_three_favorites_operations() -> None:
    facts = _facts(json.loads(SNAPSHOT.read_text(encoding="utf-8")))

    assert facts["GET /api/favorites.operationId"] == "GetFavorites"
    assert facts["POST /api/favorites.operationId"] == "CreateFavorite"
    assert facts["DELETE /api/favorites/{id}.operationId"] == "DeleteFavorite"


def test_the_favorites_contract_matches_dotnet_except_for_the_accepted_differences() -> None:
    found = _differences()

    assert sorted(found - ACCEPTED) == [], "a difference from .NET that is not accepted"
    assert sorted(ACCEPTED - found) == [], "an accepted difference that no longer exists"
