"""Pydantic schemas (DTOs) for request/response validation."""

from typing import Optional
from sqlmodel import SQLModel, Field


# =============================================================================
# Auth DTOs
# =============================================================================

class RegisterDTO(SQLModel):
    """Request body for user registration."""

    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    terms_accepted: bool = Field(default=True)  # Frontend validates this


class LoginDTO(SQLModel):
    """Request body for user login."""

    email: str
    password: str
    remember_me: bool = Field(default=False)  # Extends token expiration


class AuthResponseDTO(SQLModel):
    """Response body for successful authentication."""

    user: "UserDTO"
    token: str


class UserDTO(SQLModel):
    """User data returned to client (no password)."""

    id: str
    email: str
    name: str


# =============================================================================
# OAuth DTOs
# =============================================================================

class OAuthCallbackDTO(SQLModel):
    """Request body for OAuth callback (code exchange)."""

    code: str
    state: Optional[str] = None
    redirect_uri: str


class OAuthStateDTO(SQLModel):
    """Response for initiating OAuth flow."""

    auth_url: str
    state: str


# =============================================================================
# Password Reset DTOs
# =============================================================================

class ForgotPasswordDTO(SQLModel):
    """Request body for initiating password reset."""

    email: str = Field(min_length=5, max_length=255)


class ResetPasswordDTO(SQLModel):
    """Request body for resetting password with token."""

    token: str
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponseDTO(SQLModel):
    """Generic success message response."""

    message: str


# =============================================================================
# Task DTOs
# =============================================================================

class CreateTaskDTO(SQLModel):
    """Request body for creating a new task."""

    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None


class UpdateTaskDTO(SQLModel):
    """Request body for updating an existing task (partial update)."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_completed: Optional[bool] = None


# =============================================================================
# Phase III - Chat DTOs
# =============================================================================


class ChatRequestDTO(SQLModel):
    """Request body for sending a chat message."""

    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[int] = None


class ToolCallResultDTO(SQLModel):
    """Tool call result in chat response."""

    tool: str
    success: bool
    result: Optional[dict] = None
    error: Optional[str] = None


class ChatResponseDTO(SQLModel):
    """Response body for chat message."""

    conversation_id: int
    response: str
    tool_calls: list[ToolCallResultDTO] = []


class MessageDTO(SQLModel):
    """Message data returned to client."""

    id: int
    role: str
    content: str
    tool_calls: Optional[dict] = None
    created_at: str  # ISO format string


class ConversationDTO(SQLModel):
    """Conversation data returned to client."""

    id: int
    title: Optional[str] = None
    created_at: str  # ISO format string
    updated_at: str  # ISO format string
    message_count: Optional[int] = None


class ConversationListDTO(SQLModel):
    """Response body for listing conversations."""

    conversations: list[ConversationDTO]
    count: int


class MessageListDTO(SQLModel):
    """Response body for listing messages."""

    messages: list[MessageDTO]
    conversation_id: int


# =============================================================================
# Phase V - Tag DTOs
# =============================================================================


class CreateTagDTO(SQLModel):
    """Request body for creating a tag."""

    name: str = Field(min_length=1, max_length=50)
    color: Optional[str] = Field(default=None, max_length=7)


class TagDTO(SQLModel):
    """Tag data returned to client."""

    id: int
    name: str
    color: Optional[str] = None
    created_at: str  # ISO format


class TagListDTO(SQLModel):
    """Response body for listing tags."""

    tags: list[TagDTO]
    count: int


class TaskTagDTO(SQLModel):
    """Request body for adding a tag to a task."""

    tag_id: int
