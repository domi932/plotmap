from dataclasses import dataclass

from fastapi import Header, HTTPException, status
from supabase_client import supabase


@dataclass
class AuthUser:
    id: str
    email: str


async def get_current_user(authorization: str = Header(...)) -> AuthUser:
    """Validate a Supabase JWT and return an AuthUser(id, email).

    The token must be supplied as:  Authorization: Bearer <jwt>
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be 'Bearer <token>'",
        )
    token = authorization[len("Bearer "):]
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return AuthUser(
            id=response.user.id,
            email=response.user.email or "",
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
