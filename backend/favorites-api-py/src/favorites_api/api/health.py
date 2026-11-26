"""Liveness endpoint.

It answers 200 while the process can serve requests and checks nothing else. A readiness check
that also reaches the database comes with the persistence story (#135), not here.
"""

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: Literal["ok"]


@router.get("/health", operation_id="GetHealth")
def get_health() -> HealthResponse:
    return HealthResponse(status="ok")
