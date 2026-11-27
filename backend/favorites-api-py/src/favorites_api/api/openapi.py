"""OpenAPI tweaks so the document tells the same story as the .NET one."""

from typing import Any

from fastapi import FastAPI

_VALIDATION_SCHEMAS = ("HTTPValidationError", "ValidationError")


def hide_validation_responses(app: FastAPI) -> None:
    """FastAPI advertises a 422 on every route that takes input. This service answers 400 for those
    (see ``problems.py``), as the .NET one does, so the 422 and its schemas are left out."""
    original = app.openapi

    def openapi() -> dict[str, Any]:
        if app.openapi_schema is not None:
            return app.openapi_schema
        schema = original()  # builds and caches the document; it is edited in place
        for path_item in schema["paths"].values():
            for operation in path_item.values():
                operation["responses"].pop("422", None)
        for name in _VALIDATION_SCHEMAS:
            schema.get("components", {}).get("schemas", {}).pop(name, None)
        return schema

    app.openapi = openapi  # type: ignore[method-assign]
