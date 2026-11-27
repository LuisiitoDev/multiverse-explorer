"""How a use case says it did not succeed, without knowing about HTTP.

The API layer turns an ``Error`` into a problem document: validation is 400, not found is 404 and
conflict is 409 (same mapping as ``ErrorResults.ToProblem`` in the .NET service).
"""

from dataclasses import dataclass
from enum import Enum


class ErrorType(Enum):
    VALIDATION = "validation"
    NOT_FOUND = "not_found"
    CONFLICT = "conflict"


@dataclass(frozen=True, slots=True)
class Error:
    type: ErrorType
    message: str

    @classmethod
    def validation(cls, message: str) -> "Error":
        return cls(ErrorType.VALIDATION, message)

    @classmethod
    def not_found(cls, message: str) -> "Error":
        return cls(ErrorType.NOT_FOUND, message)

    @classmethod
    def conflict(cls, message: str) -> "Error":
        return cls(ErrorType.CONFLICT, message)
