"""OpenAPI tweaks so the document tells the same story as the .NET one."""

from typing import Any

from fastapi import FastAPI

_VALIDATION_SCHEMAS = ("HTTPValidationError", "ValidationError")
_PROBLEM = "application/problem+json"


def align_openapi_with_dotnet(app: FastAPI) -> None:
    """Edits the generated document in three ways, all to match what the .NET one publishes.

    FastAPI advertises a 422 on every route that takes input. This service answers 400 for those
    (see ``problems.py``), so the 422 and its schemas are left out. Error responses are problem
    documents, so their media type is ``application/problem+json``, not ``application/json``.
    """
    original = app.openapi

    def openapi() -> dict[str, Any]:
        if app.openapi_schema is not None:
            return app.openapi_schema
        schema = original()  # builds and caches the document; it is edited in place
        for path_item in schema["paths"].values():
            for operation in path_item.values():
                responses = operation["responses"]
                responses.pop("422", None)
                for status, response in responses.items():
                    content = response.get("content", {})
                    if status.isdigit() and int(status) >= 400 and "application/json" in content:
                        content[_PROBLEM] = content.pop("application/json")
        for name in _VALIDATION_SCHEMAS:
            schema.get("components", {}).get("schemas", {}).pop(name, None)
        return schema

    app.openapi = openapi  # type: ignore[method-assign]
