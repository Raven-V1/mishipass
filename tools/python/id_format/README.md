# MishiPass ID Format

## Pattern

```
MP-<CC>-<S1>-<S2>
```

| Segment | Length | Characters | Notes |
|---|---|---|---|
| `MP` | 2 | literal | Fixed prefix, always uppercase |
| `CC` | 2 | `A-Z` | Country code — cosmetic only (see below) |
| `S1` | 4 | Crockford Base32 | Random segment 1 |
| `S2` | 4 | Crockford Base32 | Random segment 2 |

**Full regex (case-sensitive):**
```
^MP-[A-Z]{2}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$
```

Example: `MP-MX-7X3B-9K21`

---

## Alphabet

The random segments use **Crockford Base32**:

```
0123456789ABCDEFGHJKMNPQRSTVWXYZ
```

Four characters are intentionally excluded from the full uppercase set:

| Excluded | Reason |
|---|---|
| `I` | Visually ambiguous with `1` |
| `L` | Visually ambiguous with `1` |
| `O` | Visually ambiguous with `0` |
| `U` | Visually ambiguous with `V` |

This prevents misreading on printed QR tags and physical cat collars, where
fonts and wear can make similar-looking characters indistinguishable.

---

## Country segment — cosmetic only

`CC` is **display context, not a security boundary.**

- It is shown as a registered-country badge on the public cat profile.
- It is not validated against a real country list in Beta.
- It does **not** contribute to uniqueness. Two cats with different country
  codes but identical random segments would be a collision — uniqueness is
  the responsibility of the data layer (D1), not this format.
- The security model documents this explicitly to pre-empt judge questions
  about enumeration risk.

---

## Canonical form

MishiPass IDs are **canonical uppercase only.** The format contract is strict:

- Every letter in a generated or stored ID is uppercase ASCII.
- `generate_id` requires `country_code` to be **exactly two uppercase ASCII
  letters (`A-Z`)**. No normalization is applied. Lowercase, mixed-case,
  non-ASCII look-alikes (e.g. Cyrillic `А` U+0410), or wrong-length input
  all raise `ValueError`.
- `validate_id` and `parse_id` reject any value that does not exactly match
  the pattern — including lowercase, whitespace-padded strings, and values
  containing non-ASCII characters.

Any caller that wants to accept user-typed input must normalize and validate
before calling these functions, not rely on this library to do it silently.

---

## Entropy and collision probability

Each random segment is 4 characters drawn from a 32-symbol alphabet:

```
entropy per segment  = 4 × log₂(32) = 4 × 5 = 20 bits
total entropy (S1+S2) = 40 bits  ≈  1.1 × 10¹² combinations
```

Randomness is generated with Python's `secrets` module (CSPRNG), not
`random`.

**Birthday-collision probability:** at ~1.2 million IDs the probability of at
least one collision reaches ~50% (birthday bound for 2⁴⁰ buckets). At typical
hackathon/Beta scale (thousands of cats) the risk is negligible, but at
production scale the data layer must enforce uniqueness.

**Uniqueness is the data layer's responsibility, not this tooling's.**
The D1 schema must place a `UNIQUE` constraint on the public ID column. The
TypeScript Worker that generates live IDs must catch the unique-constraint
violation and retry generation. This Python tooling only *defines* the format
and generates demo/seed IDs; it makes no guarantee of global uniqueness.

---

## Python role

This module is **tooling only**. It defines the format, generates demo and
seed IDs, and provides test vectors for the TypeScript Worker to validate
against. It is never on the production request path.

Live ID generation for real cats is performed by the TypeScript Cloudflare
Worker.
