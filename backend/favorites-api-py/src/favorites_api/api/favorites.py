"""``/api/favorites``: the signed-in user's favorites.

Same URLs, payloads, status codes and operation names as ``FavoriteEndpoints.cs``. The user comes
from the session, never from the request. The routes are plain ``def``: FastAPI runs them in a
thread pool, which is what the synchronous database layer expects.
"""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from favorites_api.api.problems import ProblemError
from favorites_api.api.session import CurrentUserId, current_user_id
from favorites_api.application.errors import Error, ErrorType
from favorites_api.application.favorites import FavoriteService

_STATUS = {ErrorType.VALIDATION: 400, ErrorType.NOT_FOUND: 404, ErrorType.CONFLICT: 409}


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class FavoriteResponse(_Camel):
    id: int
    user_id: UUID
    resource_type: str
    resource_id: int
    create_at: datetime


class Problem(BaseModel):
    type: str | None = None
    title: str
    status: int
    detail: str


def _service(request: Request) -> FavoriteService:
    service: FavoriteService | None = request.app.state.favorites
    if service is None:  # create_app refuses to start without one; this is a safeguard
        raise ProblemError(503, "The favorites database is not configured.")
    return service


Service = Annotated[FavoriteService, Depends(_service)]


def _failure(error: Error) -> ProblemError:
    return ProblemError(_STATUS[error.type], error.message)


def _problem(status: int) -> dict[int | str, dict[str, object]]:
    return {status: {"model": Problem, "description": "Problem details"}}


# Sign-in is checked for every route, so a request without a session is a 401.
router = APIRouter(
    prefix="/api/favorites", tags=["Favorites"], dependencies=[Depends(current_user_id)]
)


@router.get(
    "",
    operation_id="GetFavorites",
    responses=_problem(400),
)
def get_favorites(
    user_id: CurrentUserId,
    service: Service,
    type_filter: Annotated[str | None, Query(alias="type")] = None,
) -> list[FavoriteResponse]:
    result = service.get(user_id, type_filter)
    if isinstance(result, Error):
        raise _failure(result)
    return [FavoriteResponse.model_validate(favorite) for favorite in result]
