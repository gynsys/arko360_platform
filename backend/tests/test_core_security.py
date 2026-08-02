"""Unit tests for app.core.security (password hashing and JWT handling)."""
from datetime import timedelta

import pytest
from jose import jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    hash_password,
    verify_access_token,
    verify_password,
)


def test_hash_password_returns_distinct_salted_hashes():
    first = hash_password("s3cret-pass")
    second = hash_password("s3cret-pass")

    assert first != "s3cret-pass"
    assert first != second
    assert verify_password("s3cret-pass", first)
    assert verify_password("s3cret-pass", second)


def test_verify_password_rejects_wrong_password():
    assert not verify_password("wrong", hash_password("right"))


def test_verify_password_returns_false_for_empty_hash():
    assert not verify_password("anything", "")


def test_password_longer_than_bcrypt_limit_is_truncated():
    long_password = "a" * 100
    hashed = hash_password(long_password)

    assert verify_password(long_password, hashed)
    # Bytes beyond the 72-byte bcrypt limit are ignored.
    assert verify_password("a" * 72, hashed)


def test_create_access_token_embeds_payload_and_expiry():
    token = create_access_token({"sub": "user@example.com", "doctor_id": 7})
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

    assert payload["sub"] == "user@example.com"
    assert payload["doctor_id"] == 7
    assert "exp" in payload


def test_create_access_token_honours_custom_expiry():
    short = create_access_token({"sub": "a"}, expires_delta=timedelta(minutes=1))
    default = create_access_token({"sub": "a"})

    short_exp = jwt.decode(short, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])["exp"]
    default_exp = jwt.decode(default, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])["exp"]

    assert short_exp < default_exp


def test_create_access_token_does_not_mutate_input():
    data = {"sub": "user@example.com"}
    create_access_token(data)

    assert data == {"sub": "user@example.com"}


def test_verify_access_token_roundtrip():
    token = create_access_token({"sub": "user@example.com"})

    assert verify_access_token(token)["sub"] == "user@example.com"


@pytest.mark.parametrize("token", ["", "not-a-jwt", "a.b.c"])
def test_verify_access_token_returns_none_for_invalid_tokens(token):
    assert verify_access_token(token) is None


def test_verify_access_token_returns_none_for_expired_token():
    token = create_access_token({"sub": "a"}, expires_delta=timedelta(seconds=-10))

    assert verify_access_token(token) is None


def test_verify_access_token_returns_none_for_foreign_signature():
    token = jwt.encode({"sub": "a"}, "another-key", algorithm=settings.ALGORITHM)

    assert verify_access_token(token) is None
