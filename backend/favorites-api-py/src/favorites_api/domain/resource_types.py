"""The kinds of resource a user can save as favorite. Same set and rules as the .NET code."""

CHARACTER = "character"
EPISODE = "episode"
LOCATION = "location"

_ALLOWED = frozenset({CHARACTER, EPISODE, LOCATION})


def is_valid(value: str | None) -> bool:
    """True for one of the three types, in any letter case."""
    return value is not None and value.lower() in _ALLOWED


def normalize(value: str) -> str:
    """The form that is stored and compared: lower case."""
    return value.lower()
