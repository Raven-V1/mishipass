"""Pytest tests for the MishiPass public ID format tooling."""

import json
import re
from pathlib import Path

import pytest

from id_format import ALPHABET, generate_id, parse_id, validate_id

_ID_PATTERN = re.compile(
    r"^MP-[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$"
)

VECTORS_PATH = Path(__file__).parent.parent / "validation" / "test_vectors.json"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_vectors():
    with open(VECTORS_PATH, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# ALPHABET
# ---------------------------------------------------------------------------

def test_alphabet_length():
    assert len(ALPHABET) == 32


def test_alphabet_excluded_chars():
    for char in "ILOU":
        assert char not in ALPHABET, f"{char!r} must be excluded from ALPHABET"


def test_alphabet_no_lowercase():
    assert ALPHABET == ALPHABET.upper()


# ---------------------------------------------------------------------------
# generate_id
# ---------------------------------------------------------------------------

def test_generated_id_passes_validate():
    for _ in range(100):
        assert validate_id(generate_id("MX"))


def test_generated_id_matches_regex():
    for _ in range(100):
        assert _ID_PATTERN.match(generate_id("MX"))


def test_generate_rejects_invalid_country_codes():
    with pytest.raises(ValueError):
        generate_id("M")       # too short
    with pytest.raises(ValueError):
        generate_id("MEX")     # too long
    with pytest.raises(ValueError):
        generate_id("M1")      # digit in CC


def test_generate_rejects_lowercase_country_code():
    with pytest.raises(ValueError):
        generate_id("mx")


def test_generate_rejects_mixed_case_country_code():
    with pytest.raises(ValueError):
        generate_id("Mx")


def test_generate_rejects_non_ascii_country_code():
    # Cyrillic А (U+0410) is visually identical to Latin A but must be rejected.
    with pytest.raises(ValueError):
        generate_id("АX")


def test_generated_ids_use_only_alphabet_chars():
    for _ in range(50):
        mid = generate_id("US")
        _, _, s1, s2 = mid.split("-")
        for ch in s1 + s2:
            assert ch in ALPHABET, f"Unexpected char {ch!r} in generated ID"


# ---------------------------------------------------------------------------
# validate_id
# ---------------------------------------------------------------------------

def test_validate_rejects_empty_string():
    assert not validate_id("")


def test_validate_rejects_wrong_prefix():
    assert not validate_id("XX-MX-7X3B-9K21")


def test_validate_rejects_lowercase_segments():
    assert not validate_id("MP-MX-7x3b-9k21")


def test_validate_rejects_excluded_chars():
    assert not validate_id("MP-MX-I111-9K21")  # I excluded
    assert not validate_id("MP-MX-L111-9K21")  # L excluded
    assert not validate_id("MP-MX-OOO0-9K21")  # O excluded
    assert not validate_id("MP-MX-UUU0-9K21")  # U excluded


# ---------------------------------------------------------------------------
# Round-trip: generate → parse
# ---------------------------------------------------------------------------

def test_round_trip_generate_parse():
    for _ in range(20):
        original = generate_id("DE")
        parsed = parse_id(original)
        assert parsed["prefix"] == "MP"
        assert parsed["country"] == "DE"
        assert len(parsed["seg1"]) == 4
        assert len(parsed["seg2"]) == 4
        reconstructed = f"MP-{parsed['country']}-{parsed['seg1']}-{parsed['seg2']}"
        assert reconstructed == original


def test_parse_raises_on_invalid():
    with pytest.raises(ValueError):
        parse_id("not-valid")


def test_parse_known_id():
    result = parse_id("MP-MX-7X3B-9K21")
    assert result == {"prefix": "MP", "country": "MX", "seg1": "7X3B", "seg2": "9K21"}


# ---------------------------------------------------------------------------
# Test vectors — valid cases
# ---------------------------------------------------------------------------

def test_valid_vectors_pass_validate():
    vectors = _load_vectors()
    for v in vectors["valid"]:
        assert validate_id(v), f"Expected valid, got invalid: {v!r}"


def test_valid_vectors_match_regex():
    vectors = _load_vectors()
    for v in vectors["valid"]:
        assert _ID_PATTERN.match(v), f"Expected regex match: {v!r}"


def test_valid_vectors_parse_without_error():
    vectors = _load_vectors()
    for v in vectors["valid"]:
        result = parse_id(v)
        assert result["prefix"] == "MP"


# ---------------------------------------------------------------------------
# Test vectors — invalid cases
# ---------------------------------------------------------------------------

def test_invalid_vectors_fail_validate():
    vectors = _load_vectors()
    for entry in vectors["invalid"]:
        assert not validate_id(entry["value"]), (
            f"Expected invalid but validate_id returned True: "
            f"{entry['value']!r} (reason: {entry['reason']})"
        )


def test_invalid_vectors_fail_parse():
    vectors = _load_vectors()
    for entry in vectors["invalid"]:
        with pytest.raises(ValueError):
            parse_id(entry["value"])


# ---------------------------------------------------------------------------
# Explicit coverage for canonicalization invalid cases
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("value,reason", [
    ("", "empty string"),
    (" MP-MX-7X3B-9K21", "leading whitespace"),
    ("MP-MX-7X3B-9K21 ", "trailing whitespace"),
    ("MP-MX-7X3B9K21", "missing hyphen between segments"),
    ("mp-mx-7x3b-9k21", "lowercase, non-canonical"),
    ("MP-АX-7X3B-9K21", "non-ASCII look-alike (Cyrillic А, U+0410) in country code"),
])
def test_canonicalization_invalids_fail_validate(value, reason):
    assert not validate_id(value), f"Expected invalid ({reason}): {value!r}"


@pytest.mark.parametrize("value,reason", [
    ("", "empty string"),
    (" MP-MX-7X3B-9K21", "leading whitespace"),
    ("MP-MX-7X3B-9K21 ", "trailing whitespace"),
    ("MP-MX-7X3B9K21", "missing hyphen between segments"),
    ("mp-mx-7x3b-9k21", "lowercase, non-canonical"),
    ("MP-АX-7X3B-9K21", "non-ASCII look-alike (Cyrillic А, U+0410) in country code"),
])
def test_canonicalization_invalids_fail_parse(value, reason):
    with pytest.raises(ValueError):
        parse_id(value)


# ---------------------------------------------------------------------------
# Country segment is cosmetic — different CC, identical behaviour
# ---------------------------------------------------------------------------

def test_country_code_is_cosmetic():
    """Any valid 2-letter CC produces a structurally identical ID."""
    for cc in ["MX", "US", "DE", "JP", "FR", "ZZ"]:
        mid = generate_id(cc)
        assert validate_id(mid)
        parsed = parse_id(mid)
        assert parsed["country"] == cc
