# Better Auth + JWT Integration Skill

## Purpose

Guide for implementing authentication where Better Auth (JavaScript/TypeScript) on Next.js frontend issues JWT tokens that are verified by FastAPI (Python) backend.

---

## The Challenge

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          THE PROBLEM                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   FRONTEND (Next.js)              BACKEND (FastAPI)                     │
│   ┌──────────────────┐            ┌──────────────────┐                  │
│   │                  │            │                  │                  │
│   │  Better Auth     │  ───???──► │  Python API      │                  │
│   │  (JavaScript)    │            │  (No Better Auth)│                  │
│   │                  │            │                  │                  │
│   └──────────────────┘            └──────────────────┘                  │
│                                                                          │
│   Better Auth handles login,      How does FastAPI know                 │
│   sessions, and user management   which user is making                  │
│   in JavaScript/TypeScript.       API requests?                         │
│                                                                          │
│   FastAPI is Python - it cannot                                         │
│   directly use Better Auth.                                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## The Solution

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          THE SOLUTION: JWT                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   JWT (JSON Web Token) = Universal Language                             │
│                                                                          │
│   ┌──────────────────┐            ┌──────────────────┐                  │
│   │                  │            │                  │                  │
│   │  Better Auth     │  ──JWT───► │  python-jose     │                  │
│   │  Creates token   │            │  Verifies token  │                  │
│   │                  │            │                  │                  │
│   └──────────────────┘            └──────────────────┘                  │
│                                                                          │
│   JWT is a standard format that BOTH JavaScript and Python              │
│   can create, sign, and verify using the SAME secret key.               │
│                                                                          │
│   Token contains:                                                        │
│   {                                                                      │
│     "sub": "user_abc123",     ← User ID                                 │
│     "email": "user@example.com",                                        │
│     "exp": 1735689600,        ← Expiration timestamp                    │
│     "iat": 1735084800         ← Issued at timestamp                     │
│   }                                                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   USER                    FRONTEND                    BACKEND            │
│    │                      (Next.js)                   (FastAPI)          │
│    │                         │                           │               │
│    │  1. Submit login form   │                           │               │
│    │ ───────────────────────►│                           │               │
│    │                         │                           │               │
│    │                   2. Better Auth                    │               │
│    │                      validates                      │               │
│    │                      credentials                    │               │
│    │                         │                           │               │
│    │                   3. Creates session                │               │
│    │                      + issues JWT                   │               │
│    │                         │                           │               │
│    │                   ┌─────┴─────┐                     │               │
│    │                   │ JWT Token │                     │               │
│    │                   │ {         │                     │               │
│    │                   │   sub,    │                     │               │
│    │                   │   email,  │                     │               │
│    │                   │   exp     │                     │               │
│    │                   │ }         │                     │               │
│    │                   └─────┬─────┘                     │               │
│    │                         │                           │               │
│    │  4. Store in            │                           │               │
│    │     httpOnly cookie     │                           │               │
│    │ ◄───────────────────────│                           │               │
│    │                         │                           │               │
│    │  5. User clicks         │                           │               │
│    │     "View Tasks"        │                           │               │
│    │ ───────────────────────►│                           │               │
│    │                         │                           │               │
│    │                   6. Extract JWT                    │               │
│    │                      from cookie                    │               │
│    │                         │                           │               │
│    │                   7. Send request with              │               │
│    │                      Authorization header           │               │
│    │                         │  Authorization:           │               │
│    │                         │  Bearer eyJhbG...         │               │
│    │                         │ ─────────────────────────►│               │
│    │                         │                           │               │
│    │                         │                     8. Extract token      │
│    │                         │                        from header        │
│    │                         │                           │               │
│    │                         │                     9. Verify signature   │
│    │                         │                        with secret        │
│    │                         │                           │               │
│    │                         │                    10. Decode payload     │
│    │                         │                        get user_id        │
│    │                         │                           │               │
│    │                         │                    11. Validate user_id   │
│    │                         │                        matches URL        │
│    │                         │                           │               │
│    │                         │                    12. Query database     │
│    │                         │                        WHERE user_id=X    │
│    │                         │                           │               │
│    │                         │                    13. Return user's      │
│    │                         │  ◄────────────────────────    data only   │
│    │                         │                           │               │
│    │  14. Display tasks      │                           │               │
│    │ ◄───────────────────────│                           │               │
│    │                         │                           │               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Better Auth Setup (Frontend)

### Installation

```bash
npm install better-auth
```

### Server-Side Configuration

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  // Database connection (shared with Better Auth tables)
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),

  // Email/password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false, // Set true for production
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // Refresh session daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minute cache
    },
  },

  // JWT Plugin - CRITICAL for FastAPI integration
  plugins: [
    jwt({
      // JWT configuration
      jwt: {
        // Token expiration (matches session)
        expirationTime: "7d",

        // Custom claims to include in token
        definePayload: async ({ user, session }) => ({
          sub: user.id,           // User ID (required)
          email: user.email,      // User email
          name: user.name,        // User name
          sessionId: session.id,  // Session reference
        }),
      },

      // JWKS endpoint for external verification (optional)
      jwks: {
        // Disable if only using shared secret
        disabled: true,
      },
    }),
  ],

  // Secret for signing tokens
  // MUST match BETTER_AUTH_SECRET in FastAPI backend
  secret: process.env.BETTER_AUTH_SECRET,

  // Trusted origins for CORS
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],

  // Advanced options
  advanced: {
    // Cookie configuration
    cookiePrefix: "better-auth",
    useSecureCookies: process.env.NODE_ENV === "production",

    // Default cookie options
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  },
});

// Export auth type for client
export type Auth = typeof auth;
```

### Client-Side Configuration

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",

  plugins: [
    // JWT client plugin for token access
    jwtClient(),
  ],
});

// Export commonly used functions
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// Get JWT token for API calls
export async function getJwtToken(): Promise<string | null> {
  try {
    const session = await authClient.getSession();

    if (!session?.data?.session) {
      return null;
    }

    // Get JWT from session
    // The JWT plugin adds a token to the session
    const token = await authClient.$fetch("/api/auth/token", {
      method: "GET",
    });

    return token?.token || null;
  } catch (error) {
    console.error("Failed to get JWT token:", error);
    return null;
  }
}

// Alternative: Extract from cookie directly
export function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "better-auth.session_token") {
      return value;
    }
  }
  return null;
}
```

### Auth API Route

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Token Endpoint (if using JWT plugin)

```typescript
// app/api/auth/token/route.ts
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Generate JWT token from session
    const token = await auth.api.signToken({
      user: session.user,
      session: session.session,
    });

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
```

---

## Frontend API Client

```typescript
// lib/api.ts
import { getSession } from "./auth-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Get JWT token from Better Auth session.
 * This token is sent to FastAPI for verification.
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // Get current session from Better Auth
    const session = await getSession();

    if (!session?.data) {
      return null;
    }

    // Better Auth stores the session token
    // This is the JWT that FastAPI will verify
    return session.data.session?.token || null;
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
}

/**
 * Make authenticated API request to FastAPI backend.
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, headers: customHeaders, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  // Attach JWT token to Authorization header
  if (!skipAuth) {
    const token = await getAuthToken();

    if (token) {
      // CRITICAL: This header is what FastAPI reads
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: "include", // Include cookies if needed
    });

    // Handle 401 Unauthorized - token invalid or expired
    if (response.status === 401) {
      // Clear session and redirect to login
      if (typeof window !== "undefined") {
        // Optionally sign out
        // await signOut();
        window.location.href = "/login?error=session_expired";
      }
      throw new Error("Session expired. Please log in again.");
    }

    // Handle 403 Forbidden - user trying to access another user's data
    if (response.status === 403) {
      throw new Error("Access denied. You can only access your own resources.");
    }

    // Handle 404 Not Found
    if (response.status === 404) {
      throw new Error("Resource not found.");
    }

    // Handle other errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || errorData.error || `Request failed: ${response.status}`
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Network error. Please check your connection.");
  }
}

// ============================================================
// API Methods
// ============================================================

export const api = {
  // Generic methods
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

// ============================================================
// Task-Specific API Functions
// ============================================================

import { Task, TaskCreateInput, TaskUpdateInput } from "@/types";

export async function getTasks(userId: string): Promise<Task[]> {
  const response = await api.get<{ items: Task[]; total: number }>(
    `/api/${userId}/tasks`
  );
  return response.items;
}

export async function getTask(userId: string, taskId: number): Promise<Task> {
  return api.get<Task>(`/api/${userId}/tasks/${taskId}`);
}

export async function createTask(
  userId: string,
  data: TaskCreateInput
): Promise<Task> {
  return api.post<Task>(`/api/${userId}/tasks`, data);
}

export async function updateTask(
  userId: string,
  taskId: number,
  data: TaskUpdateInput
): Promise<Task> {
  return api.patch<Task>(`/api/${userId}/tasks/${taskId}`, data);
}

export async function deleteTask(
  userId: string,
  taskId: number
): Promise<void> {
  await api.delete(`/api/${userId}/tasks/${taskId}`);
}

export async function toggleTaskComplete(
  userId: string,
  taskId: number
): Promise<Task> {
  return api.patch<Task>(`/api/${userId}/tasks/${taskId}/complete`);
}
```

---

## Backend JWT Verification

```python
# middleware/jwt_auth.py
import os
from typing import Optional
from fastapi import HTTPException, Header, status
from jose import jwt, JWTError, ExpiredSignatureError
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# CRITICAL: This secret MUST match Better Auth's secret
# ============================================================
BETTER_AUTH_SECRET = os.getenv("BETTER_AUTH_SECRET")

if not BETTER_AUTH_SECRET:
    raise ValueError(
        "BETTER_AUTH_SECRET environment variable is required. "
        "It must match the secret used in Better Auth on the frontend."
    )

# JWT algorithm - Better Auth uses HS256 by default
ALGORITHM = "HS256"


class TokenPayload(BaseModel):
    """
    JWT payload structure from Better Auth.

    Fields:
        sub: User ID (subject claim)
        email: User email
        name: User name (optional)
        exp: Expiration timestamp
        iat: Issued at timestamp
    """
    sub: str                    # User ID
    email: Optional[str] = None
    name: Optional[str] = None
    exp: int                    # Expiration
    iat: int                    # Issued at
    sessionId: Optional[str] = None


class AuthenticatedUser(BaseModel):
    """
    Authenticated user information extracted from verified JWT.

    This is what routes receive after successful authentication.
    """
    user_id: str
    email: Optional[str] = None
    name: Optional[str] = None


def verify_jwt_token(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> AuthenticatedUser:
    """
    FastAPI dependency to verify JWT token from Better Auth.

    This function:
    1. Extracts token from Authorization header
    2. Verifies signature using shared secret
    3. Decodes payload
    4. Returns authenticated user info

    Usage:
        @router.get("/protected")
        async def protected_route(
            user: AuthenticatedUser = Depends(verify_jwt_token)
        ):
            return {"user_id": user.user_id}

    Raises:
        HTTPException 401: Token missing, invalid, or expired
    """

    # ─────────────────────────────────────────────────────────
    # Step 1: Check if Authorization header exists
    # ─────────────────────────────────────────────────────────
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing. Include: Authorization: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ─────────────────────────────────────────────────────────
    # Step 2: Extract token from "Bearer <token>" format
    # ─────────────────────────────────────────────────────────
    parts = authorization.split()

    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    scheme, token = parts

    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication scheme: {scheme}. Expected: Bearer",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ─────────────────────────────────────────────────────────
    # Step 3: Verify and decode the JWT token
    # ─────────────────────────────────────────────────────────
    try:
        # Verify signature and decode payload
        # This uses the SAME secret as Better Auth
        payload = jwt.decode(
            token,
            BETTER_AUTH_SECRET,
            algorithms=[ALGORITHM],
            options={
                "verify_exp": True,      # Check expiration
                "verify_iat": True,      # Check issued at
                "require_exp": True,     # Require expiration claim
                "require_sub": True,     # Require subject (user_id) claim
            },
        )

        # ─────────────────────────────────────────────────────
        # Step 4: Extract user_id from 'sub' claim
        # ─────────────────────────────────────────────────────
        user_id: str = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user ID (sub claim)",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # ─────────────────────────────────────────────────────
        # Step 5: Return authenticated user info
        # ─────────────────────────────────────────────────────
        return AuthenticatedUser(
            user_id=user_id,
            email=payload.get("email"),
            name=payload.get("name"),
        )

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_user_access(
    user_id_from_url: str,
    authenticated_user: AuthenticatedUser
) -> None:
    """
    Verify that authenticated user can access the requested resource.

    CRITICAL SECURITY CHECK:
    Ensures users can ONLY access their own data by comparing:
    - user_id from URL path (e.g., /api/user_123/tasks)
    - user_id from JWT token (verified, cannot be forged)

    If these don't match, the user is trying to access someone else's data.

    Usage:
        @router.get("/api/{user_id}/tasks")
        async def get_tasks(
            user_id: str,
            user: AuthenticatedUser = Depends(verify_jwt_token)
        ):
            verify_user_access(user_id, user)
            # ... fetch only this user's tasks

    Raises:
        HTTPException 403: User ID mismatch (access denied)
    """
    if user_id_from_url != authenticated_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only access your own resources.",
        )


# ============================================================
# Combined Dependency (Recommended)
# ============================================================

from fastapi import Depends

def get_verified_user(
    user_id: str,
    user: AuthenticatedUser = Depends(verify_jwt_token)
) -> AuthenticatedUser:
    """
    Combined dependency: Verifies JWT AND validates user_id match.

    This is the recommended way to protect routes:
    1. Verifies JWT token is valid
    2. Checks that URL user_id matches token user_id
    3. Returns authenticated user info

    Usage:
        @router.get("/api/{user_id}/tasks")
        async def get_tasks(
            user_id: str,
            verified_user: AuthenticatedUser = Depends(get_verified_user)
        ):
            # verified_user.user_id is GUARANTEED to match user_id
            return get_user_tasks(user_id)
    """
    verify_user_access(user_id, user)
    return user
```

---

## Shared Secret Configuration

```
┌─────────────────────────────────────────────────────────────────────────┐
│              CRITICAL: SHARED SECRET CONFIGURATION                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   The BETTER_AUTH_SECRET MUST be IDENTICAL in both environments:        │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │  FRONTEND (Next.js)                                             │    │
│   │  .env.local:                                                    │    │
│   │                                                                 │    │
│   │  BETTER_AUTH_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0   │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                              ║                                           │
│                              ║  MUST BE                                  │
│                              ║  EXACTLY                                  │
│                              ║  THE SAME                                 │
│                              ▼                                           │
│   ┌────────────────────────────────────────────────────────────────┐    │
│   │  BACKEND (FastAPI)                                              │    │
│   │  .env:                                                          │    │
│   │                                                                 │    │
│   │  BETTER_AUTH_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0   │    │
│   └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│   WHY? JWT signatures use this secret:                                   │
│   - Better Auth SIGNS tokens with this secret                           │
│   - FastAPI VERIFIES tokens with this secret                            │
│   - Different secrets = verification FAILS = 401 Unauthorized           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Secret Requirements

| Requirement | Description |
|-------------|-------------|
| **Length** | Minimum 32 characters |
| **Randomness** | Cryptographically random |
| **Security** | Never commit to git |
| **Consistency** | Same value in both environments |

### Generate a Secure Secret

```bash
# Option 1: OpenSSL (recommended)
openssl rand -hex 32

# Option 2: Python
python -c "import secrets; print(secrets.token_hex(32))"

# Option 3: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Environment Files

```bash
# frontend/.env.local
BETTER_AUTH_SECRET=your-64-character-hex-string-here-do-not-commit-to-git

# backend/.env
BETTER_AUTH_SECRET=your-64-character-hex-string-here-do-not-commit-to-git
```

### .gitignore (Both Projects)

```gitignore
# Environment files with secrets
.env
.env.local
.env.*.local
```

---

## User Isolation Pattern

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     USER ISOLATION PATTERN                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   SCENARIO: User A tries to access User B's data                        │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  1. User A logs in                                            │      │
│   │     → Better Auth creates JWT with user_id = "user_a"         │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                              │                                           │
│                              ▼                                           │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  2. User A's frontend calls:                                  │      │
│   │     POST /api/user_a/tasks                                    │      │
│   │     Authorization: Bearer <jwt_with_user_a>                   │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                              │                                           │
│                              ▼                                           │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  3. Backend verifies JWT                                      │      │
│   │     → Extracts user_id = "user_a" from token                  │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                              │                                           │
│                              ▼                                           │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  4. Backend validates: URL user_id == token user_id          │      │
│   │     → "user_a" == "user_a" ✓ ACCESS GRANTED                   │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                              │                                           │
│                              ▼                                           │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  5. Database query:                                           │      │
│   │     SELECT * FROM tasks WHERE user_id = "user_a"              │      │
│   │     → Returns ONLY User A's tasks                             │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
│   ════════════════════════════════════════════════════════════════      │
│                                                                          │
│   ATTACK SCENARIO: User A tries to access User B's data                 │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  1. User A (malicious) modifies request:                      │      │
│   │     GET /api/user_b/tasks                    ← Changed URL    │      │
│   │     Authorization: Bearer <jwt_with_user_a>  ← Same token     │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                              │                                           │
│                              ▼                                           │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  2. Backend verifies JWT                                      │      │
│   │     → Extracts user_id = "user_a" from token                  │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                              │                                           │
│                              ▼                                           │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │  3. Backend validates: URL user_id == token user_id          │      │
│   │     → "user_b" != "user_a" ✗ ACCESS DENIED                    │      │
│   │     → Returns 403 Forbidden                                   │      │
│   └──────────────────────────────────────────────────────────────┘      │
│                                                                          │
│   User A CANNOT access User B's data because:                           │
│   - JWT cannot be forged (signature verification)                       │
│   - user_id in JWT cannot be changed without secret                     │
│   - Backend validates URL user_id matches token user_id                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Code Implementation

```python
# routes/tasks.py
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from middleware.jwt_auth import verify_jwt_token, verify_user_access, AuthenticatedUser
from models import Task
from db import get_session

router = APIRouter()

@router.get("/api/{user_id}/tasks")
async def get_tasks(
    user_id: str,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    # CRITICAL: Validate user can access this user_id
    verify_user_access(user_id, user)

    # CRITICAL: Always filter by user_id
    tasks = session.exec(
        select(Task).where(Task.user_id == user_id)
    ).all()

    return {"items": tasks, "total": len(tasks)}
```

---

## Error Handling

### 401 Unauthorized

**Causes:**
- No Authorization header
- Invalid token format
- Invalid signature (wrong secret)
- Expired token
- Malformed token

**Backend Response:**

```json
{
  "detail": "Token has expired. Please log in again."
}
```

**Frontend Handling:**

```typescript
// lib/api.ts
if (response.status === 401) {
  // Token invalid or expired - redirect to login
  if (typeof window !== "undefined") {
    // Clear any cached session
    await signOut();

    // Redirect to login with return URL
    const returnUrl = encodeURIComponent(window.location.pathname);
    window.location.href = `/login?returnUrl=${returnUrl}&error=session_expired`;
  }
  throw new Error("Session expired. Please log in again.");
}
```

### 403 Forbidden

**Causes:**
- Valid token but user_id mismatch
- User trying to access another user's resources
- Attempting to modify resources they don't own

**Backend Response:**

```json
{
  "detail": "Access denied. You can only access your own resources."
}
```

**Frontend Handling:**

```typescript
// lib/api.ts
if (response.status === 403) {
  // User doesn't have permission - show error, don't redirect
  throw new Error("Access denied. You can only access your own resources.");
}

// In component
try {
  await api.get(`/api/${userId}/tasks`);
} catch (error) {
  if (error.message.includes("Access denied")) {
    // Show toast or error message
    toast.error("You don't have permission to access this resource.");
  }
}
```

### Error Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ERROR HANDLING FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   REQUEST → BACKEND → ERROR?                                            │
│               │                                                          │
│               ├─► 401 UNAUTHORIZED                                       │
│               │   ├─► No token         → "Authorization header missing" │
│               │   ├─► Invalid format   → "Invalid header format"        │
│               │   ├─► Wrong signature  → "Invalid token"                │
│               │   ├─► Expired          → "Token has expired"            │
│               │   │                                                      │
│               │   └─► FRONTEND ACTION:                                   │
│               │       1. Clear session/cookies                           │
│               │       2. Redirect to /login                              │
│               │       3. Show "Please log in again"                      │
│               │                                                          │
│               ├─► 403 FORBIDDEN                                          │
│               │   ├─► user_id mismatch → "Access denied"                │
│               │   │                                                      │
│               │   └─► FRONTEND ACTION:                                   │
│               │       1. Show error message                              │
│               │       2. Do NOT redirect to login                        │
│               │       3. User is authenticated, just not authorized     │
│               │                                                          │
│               └─► 200 OK                                                 │
│                   └─► Return data                                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Security Benefits

### 1. Stateless Authentication

```
┌─────────────────────────────────────────────────────────────────┐
│  No session database lookup required for each request           │
│                                                                  │
│  Traditional Session:                                            │
│  Request → Database → Find Session → Return User                │
│  (Requires DB query every request)                              │
│                                                                  │
│  JWT:                                                            │
│  Request → Verify Signature → Decode Token → Return User        │
│  (CPU only, no database)                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Independent Verification

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend and backend verify independently:                     │
│                                                                  │
│  Frontend: Better Auth validates session, issues JWT            │
│  Backend: python-jose verifies JWT signature                    │
│                                                                  │
│  Neither needs to call the other to verify authentication.     │
│  They share only the secret, not any network calls.            │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Automatic Token Expiry

```
┌─────────────────────────────────────────────────────────────────┐
│  Tokens expire automatically:                                    │
│                                                                  │
│  JWT Payload:                                                    │
│  {                                                               │
│    "sub": "user_123",                                           │
│    "exp": 1735689600,  ← Unix timestamp                         │
│    ...                                                           │
│  }                                                               │
│                                                                  │
│  python-jose checks:                                             │
│  if current_time > exp:                                         │
│      raise ExpiredSignatureError                                │
│                                                                  │
│  No database cleanup needed - expired tokens just stop working. │
└─────────────────────────────────────────────────────────────────┘
```

### 4. User Data Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│  Every request is scoped to the authenticated user:            │
│                                                                  │
│  1. Token contains user_id                                      │
│  2. URL contains user_id                                        │
│  3. Backend validates they match                                │
│  4. Database query filtered by user_id                          │
│                                                                  │
│  THREE layers of protection:                                     │
│  - Token verification (cryptographic)                           │
│  - URL validation (access control)                              │
│  - Query filtering (data isolation)                             │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Cannot Forge Tokens

```
┌─────────────────────────────────────────────────────────────────┐
│  JWT Structure:                                                  │
│                                                                  │
│  header.payload.signature                                        │
│                                                                  │
│  Signature = HMAC_SHA256(                                        │
│    base64(header) + "." + base64(payload),                      │
│    BETTER_AUTH_SECRET                                            │
│  )                                                               │
│                                                                  │
│  To forge a token, attacker would need:                         │
│  1. The secret (never exposed)                                   │
│  2. To recreate exact signature                                  │
│                                                                  │
│  Without the secret, any modification invalidates signature.    │
│  Backend will reject: "Invalid token signature"                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete Integration Checklist

### Frontend Setup

- [ ] Install Better Auth: `npm install better-auth`
- [ ] Configure `lib/auth.ts` with JWT plugin
- [ ] Create `lib/auth-client.ts` for client-side auth
- [ ] Add API route: `app/api/auth/[...all]/route.ts`
- [ ] Create API client: `lib/api.ts` with Authorization header
- [ ] Set `BETTER_AUTH_SECRET` in `.env.local`
- [ ] Add middleware for route protection

### Backend Setup

- [ ] Install python-jose: `pip install python-jose[cryptography]`
- [ ] Create `middleware/jwt_auth.py` with verify_jwt_token
- [ ] Set `BETTER_AUTH_SECRET` in `.env` (same as frontend!)
- [ ] Add `Depends(verify_jwt_token)` to all protected routes
- [ ] Call `verify_user_access()` in all user-scoped routes
- [ ] Filter ALL database queries by user_id

### Testing Verification

- [ ] Login creates JWT (check Network tab)
- [ ] API calls include Authorization header
- [ ] Backend returns 401 without token
- [ ] Backend returns 401 with expired token
- [ ] Backend returns 403 when accessing other user's data
- [ ] Backend returns 200 with valid token and correct user_id
