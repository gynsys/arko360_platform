"""Shared authentication helpers for the Arko routers."""
from typing import Iterable, Optional

from fastapi import HTTPException, status
from passlib.context import CryptContext
import jwt

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def decode_token(
    token: str,
    expected_type: str,
    required_claims: Optional[Iterable[str]] = None,
) -> dict:
    """Decode a JWT, enforcing its `type` claim and any additional required claims.

    Raises a 401 for malformed, expired or mismatched tokens.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except Exception:
        raise CREDENTIALS_EXCEPTION

    if payload.get("sub") is None or payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    for claim in required_claims or ():
        if payload.get(claim) is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )

    return payload
