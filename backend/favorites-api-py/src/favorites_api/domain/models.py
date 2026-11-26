from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class Favorite:
    """A resource a user saved. ``create_at`` is naive UTC, as datetime2 stores it."""

    id: int
    user_id: UUID
    resource_type: str
    resource_id: int
    create_at: datetime
