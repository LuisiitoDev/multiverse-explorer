"""``/api/favorites``: list, create and delete the signed-in user's favorites.

Same URLs, payloads, status codes and operation names as ``FavoriteEndpoints.cs``. The user comes
from the session, never from the request. The routes are plain ``def``: FastAPI runs them in a
thread pool, which is what the synchronous database layer expects.
"""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field, StrictInt, StrictStr
from pydantic.alias_generators import to_camel
from starlette.convertors import Convertor, register_url_convertor

from favorites_api.api.csrf import require_csrf
from favorites_api.api.problems import ProblemError
from favorites_api.api.session import CurrentUserId, current_user_id
from favorites_api.application.errors import Error, ErrorType
from favorites_api.application.favorites import FavoriteService
from favorites_api.domain.models import Favorite

_STATUS = {ErrorType.VALIDATION: 400, ErrorType.NOT_FOUND: 404, ErrorType.CONFLICT: 409}
_INT32_MAX = 2**31 - 1


class _SignedInt(Convertor[int]):
    """ASP.NET's ``{id:long}``: a negative number still matches the route and is then a 400 from the
    validation, while text does not match and is a 404. Starlette's own ``int`` takes no minus sign.
    At most 18 digits, so the value always fits the bigint column."""

    regex = r"-?[0-9]{1,18}"

    def convert(self, value: str) -> int:
        return int(value)

    def to_string(self, value: int) -> str:
        return str(value)


register_url_convertor("signed_int", _SignedInt())


class _Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class FavoriteResponse(_Camel):
    id: int
    user_id: UUID
    resource_type: str
    resource_id: int
    create_at: datetime


class CreateFavoriteRequest(_Camel):
    """A missing field takes the value .NET gives it (null, 0), so the message is the same."""

    resource_type: StrictStr | None = None
    resource_id: Annotated[StrictInt, Field(le=_INT32_MAX)] = 0


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


# Sign-in first, then (for changes) the CSRF token, so a request without a session is a 401.
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


@router.post(
    "",
    operation_id="CreateFavorite",
    status_code=201,
    dependencies=[Depends(require_csrf)],
    responses={**_problem(400), **_problem(404), **_problem(409)},
)
def create_favorite(
    body: CreateFavoriteRequest, user_id: CurrentUserId, service: Service, response: Response
) -> FavoriteResponse:
    result = service.create(user_id, body.resource_type, body.resource_id)
    if isinstance(result, Error):
        raise _failure(result)
    created: Favorite = result
    response.headers["Location"] = f"/api/favorites/{created.id}"
    return FavoriteResponse.model_validate(created)


@router.delete(
    "/{favorite_id:signed_int}",
    operation_id="DeleteFavorite",
    status_code=204,
    response_class=Response,
    dependencies=[Depends(require_csrf)],
    responses={**_problem(400), **_problem(404)},
)
def delete_favorite(favorite_id: int, user_id: CurrentUserId, service: Service) -> Response:
    result = service.delete(favorite_id, user_id)
    if isinstance(result, Error):
        raise _failure(result)
    return Response(status_code=204)
