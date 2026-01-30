"""Authentication API endpoints - register, login, and OAuth."""

import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import bcrypt
import httpx
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlmodel import Session, select

from app.config import (
    BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    FRONTEND_URL,
)
from app.database import get_session
from app.models import User
from app.schemas import RegisterDTO, LoginDTO, AuthResponseDTO, UserDTO

# Google OAuth URLs
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT settings
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS_DEFAULT = 1
JWT_EXPIRATION_DAYS_REMEMBER = 30


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    password_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(user_id: str, email: str, remember_me: bool = False) -> str:
    """Create JWT access token with user_id in 'sub' claim."""
    now = datetime.now(timezone.utc)
    expiration_days = JWT_EXPIRATION_DAYS_REMEMBER if remember_me else JWT_EXPIRATION_DAYS_DEFAULT
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(days=expiration_days),
    }
    return jwt.encode(payload, BETTER_AUTH_SECRET, algorithm=JWT_ALGORITHM)


# =============================================================================
# POST /auth/register - Create new user account
# =============================================================================

@router.post("/register", response_model=AuthResponseDTO, status_code=201)
async def register(
    data: RegisterDTO,
    session: Session = Depends(get_session),
) -> AuthResponseDTO:
    """
    Register a new user account.

    - Validates email is unique
    - Hashes password with bcrypt
    - Creates user in database
    - Returns JWT token for immediate login
    """
    # Normalize email to lowercase for case-insensitive comparison
    email_lower = data.email.lower().strip()

    # Check if user already exists
    existing = session.exec(
        select(User).where(User.email == email_lower)
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists"
        )

    # Create new user with hashed password
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=email_lower,
        name=data.name.strip(),
        password_hash=hash_password(data.password),
        created_at=datetime.now(timezone.utc),
    )

    session.add(user)
    session.commit()
    session.refresh(user)

    # Generate JWT token
    token = create_access_token(user.id, user.email)

    return AuthResponseDTO(
        user=UserDTO(id=user.id, email=user.email, name=user.name),
        token=token,
    )


# =============================================================================
# POST /auth/login - Authenticate existing user
# =============================================================================

@router.post("/login", response_model=AuthResponseDTO)
async def login(
    data: LoginDTO,
    session: Session = Depends(get_session),
) -> AuthResponseDTO:
    """
    Authenticate user and return JWT token.

    - Finds user by email (case-insensitive)
    - Verifies password with bcrypt
    - Returns generic error to prevent email enumeration
    - Supports remember_me for extended session
    """
    # Normalize email
    email_lower = data.email.lower().strip()

    # Find user by email
    user = session.exec(
        select(User).where(User.email == email_lower)
    ).first()

    # Generic error message - don't reveal if email exists
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Check if user has a password (OAuth users may not)
    if not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail="This account uses Google sign-in. Please sign in with Google."
        )

    # Verify password
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Generate JWT token with remember_me support
    token = create_access_token(user.id, user.email, remember_me=data.remember_me)

    return AuthResponseDTO(
        user=UserDTO(id=user.id, email=user.email, name=user.name),
        token=token,
    )


# =============================================================================
# GET /auth/google - Redirect to Google OAuth
# =============================================================================

@router.get("/google")
async def google_oauth_redirect():
    """
    Redirect user to Google OAuth consent screen.

    Frontend calls this endpoint, which redirects to Google.
    After user consents, Google redirects back to /auth/google/callback.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured"
        )

    # Build the callback URL (backend endpoint)
    callback_url = f"{FRONTEND_URL}/api/auth/callback/google"

    # OAuth parameters
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


# =============================================================================
# POST /auth/google/callback - Handle Google OAuth callback
# =============================================================================

@router.post("/google/callback")
async def google_oauth_callback(
    code: str,
    session: Session = Depends(get_session),
) -> AuthResponseDTO:
    """
    Handle Google OAuth callback.

    - Exchanges authorization code for access token
    - Fetches user info from Google
    - Creates or updates user in database
    - Returns JWT token
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth is not configured"
        )

    callback_url = f"{FRONTEND_URL}/api/auth/callback/google"

    # Exchange authorization code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": callback_url,
            },
        )

        if token_response.status_code != 200:
            error_detail = token_response.text
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange authorization code: {error_detail}"
            )

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="No access token received from Google"
            )

        # Fetch user info from Google
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Failed to fetch user info from Google"
            )

        userinfo = userinfo_response.json()

    # Extract user data from Google response
    google_id = userinfo.get("id")
    email = userinfo.get("email", "").lower()
    name = userinfo.get("name", email.split("@")[0])

    if not google_id or not email:
        raise HTTPException(
            status_code=400,
            detail="Invalid user data from Google"
        )

    # Check if user exists (by OAuth ID or email)
    existing_user = session.exec(
        select(User).where(
            (User.oauth_provider == "google") & (User.oauth_id == google_id)
        )
    ).first()

    if not existing_user:
        # Check if user exists with same email (maybe registered with password)
        existing_user = session.exec(
            select(User).where(User.email == email)
        ).first()

        if existing_user:
            # Link OAuth to existing account
            existing_user.oauth_provider = "google"
            existing_user.oauth_id = google_id
            session.add(existing_user)
            session.commit()
            session.refresh(existing_user)

    if existing_user:
        # User exists, generate token
        token = create_access_token(existing_user.id, existing_user.email, remember_me=True)
        return AuthResponseDTO(
            user=UserDTO(id=existing_user.id, email=existing_user.email, name=existing_user.name),
            token=token,
        )

    # Create new user
    user_id = str(uuid.uuid4())
    new_user = User(
        id=user_id,
        email=email,
        name=name,
        password_hash=None,  # OAuth users don't have password
        oauth_provider="google",
        oauth_id=google_id,
        created_at=datetime.now(timezone.utc),
    )

    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    # Generate JWT token
    token = create_access_token(new_user.id, new_user.email, remember_me=True)

    return AuthResponseDTO(
        user=UserDTO(id=new_user.id, email=new_user.email, name=new_user.name),
        token=token,
    )
