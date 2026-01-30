"""JWT authentication and user access validation."""

import jwt
from fastapi import Depends, Header, HTTPException
from sqlmodel import Session, select

from app.config import BETTER_AUTH_SECRET
from app.database import get_session
from app.models import User


async def verify_jwt_token(
    authorization: str = Header(...),
    session: Session = Depends(get_session),
) -> str:
    """
    FastAPI dependency that verifies JWT token and validates user exists.

    Args:
        authorization: Authorization header value (Bearer <token>)
        session: Database session for user lookup

    Returns:
        str: The user_id extracted from the JWT 'sub' claim

    Raises:
        HTTPException: 401 if token is missing, invalid, expired, or user doesn't exist
    """
    # Check for Bearer prefix
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header"
        )

    # Extract token
    token = authorization[7:]  # Remove "Bearer " prefix

    try:
        # Decode and verify JWT
        payload = jwt.decode(
            token,
            BETTER_AUTH_SECRET,
            algorithms=["HS256"]
        )

        # Extract user_id from 'sub' claim
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing user ID"
            )

        # Verify user exists in database
        user = session.exec(
            select(User).where(User.id == user_id)
        ).first()

        if not user:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: user not found"
            )

        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )


def verify_user_access(url_user_id: str, token_user_id: str) -> None:
    """
    Verify that the URL user_id matches the JWT user_id.

    Args:
        url_user_id: User ID from the URL path
        token_user_id: User ID extracted from JWT token

    Raises:
        HTTPException: 403 if user IDs don't match
    """
    if url_user_id != token_user_id:
        raise HTTPException(
            status_code=403,
            detail="Forbidden"
        )
