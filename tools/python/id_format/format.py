"""MishiPass public ID format — tooling layer only, not on production path."""

import re
import secrets

# Crockford Base32: digits + uppercase letters excluding I, L, O, U.
# Ambiguous characters are removed to prevent misreading on printed QR tags.
ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

_ID_PATTERN = re.compile(
    r"^MP-[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$"
)


def _random_segment() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(4))


def generate_id(country_code: str) -> str:
    """Return a new MishiPass ID for the given two-letter country code.

    country_code must be exactly 2 ASCII uppercase letters (A-Z). No
    normalization is applied — lowercase or non-ASCII input raises ValueError.
    The country segment is cosmetic display context only — uniqueness comes
    entirely from the two random segments.
    """
    if not re.fullmatch(r"[A-Z]{2}", country_code):
        raise ValueError(
            f"country_code must be exactly 2 uppercase ASCII letters (A-Z), got {country_code!r}"
        )
    return f"MP-{country_code}-{_random_segment()}-{_random_segment()}"


def validate_id(value: str) -> bool:
    """Return True if value strictly matches the MishiPass ID pattern."""
    return bool(_ID_PATTERN.fullmatch(value))


def parse_id(value: str) -> dict:
    """Parse a MishiPass ID into its components.

    Returns {"prefix": "MP", "country": <CC>, "seg1": <S1>, "seg2": <S2>}.
    Raises ValueError if value does not match the format contract.
    """
    if not validate_id(value):
        raise ValueError(f"Invalid MishiPass ID: {value!r}")
    parts = value.split("-")
    return {
        "prefix": parts[0],
        "country": parts[1],
        "seg1": parts[2],
        "seg2": parts[3],
    }
