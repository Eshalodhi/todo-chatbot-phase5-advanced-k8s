"""Chat API endpoints for Phase III AI Chatbot."""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.auth import verify_jwt_token, verify_user_access
from app.database import get_session
from app.schemas import (
    ChatRequestDTO,
    ChatResponseDTO,
    ConversationDTO,
    MessageDTO,
)
from app.services.chat.service import ChatService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chat"])


# =============================================================================
# US1: Chat with AI - POST /api/{user_id}/chat
# =============================================================================

@router.post("/{user_id}/chat", response_model=ChatResponseDTO)
async def chat(
    user_id: str,
    data: ChatRequestDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> ChatResponseDTO:
    """
    Send a message to the AI chatbot.

    The chatbot can understand natural language requests to manage tasks:
    - "Add a task to buy groceries"
    - "Show me my tasks"
    - "Mark the groceries task as done"
    - "Delete the groceries task"
    - "Rename my task to 'buy food'"

    Args:
        user_id: User ID from URL path
        data: Chat request containing message and optional conversation_id

    Returns:
        ChatResponseDTO with AI response and any tool call results
    """
    # Step 2: Verify JWT and user access
    verify_user_access(user_id, token_user_id)

    # Validate message is not empty
    if not data.message or not data.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    try:
        # Initialize chat service with database session
        chat_service = ChatService(session)

        # Process message through 9-step flow
        response = await chat_service.process_message(
            user_id=user_id,
            message=data.message.strip(),
            conversation_id=data.conversation_id,
        )

        return response

    except Exception as e:
        logger.error(f"Chat error for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your message"
        )


# =============================================================================
# US6: List Conversations - GET /api/{user_id}/conversations
# =============================================================================

@router.get("/{user_id}/conversations", response_model=List[ConversationDTO])
async def get_conversations(
    user_id: str,
    limit: int = 50,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> List[ConversationDTO]:
    """
    List all conversations for the authenticated user.

    Returns conversations ordered by most recently updated first.

    Args:
        user_id: User ID from URL path
        limit: Maximum number of conversations to return (default 50)

    Returns:
        List of ConversationDTO objects
    """
    # Verify JWT and user access
    verify_user_access(user_id, token_user_id)

    try:
        chat_service = ChatService(session)
        conversations = await chat_service.get_conversations(user_id, limit=limit)

        return [
            ConversationDTO(
                id=conv.id,
                title=conv.title,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
            )
            for conv in conversations
        ]

    except Exception as e:
        logger.error(f"Error listing conversations for user {user_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve conversations"
        )


# =============================================================================
# US7: Get Conversation Messages - GET /api/{user_id}/conversations/{conversation_id}/messages
# =============================================================================

@router.get(
    "/{user_id}/conversations/{conversation_id}/messages",
    response_model=List[MessageDTO]
)
async def get_conversation_messages(
    user_id: str,
    conversation_id: int,
    limit: int = 100,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> List[MessageDTO]:
    """
    Get messages for a specific conversation.

    Returns messages in chronological order (oldest first).

    Args:
        user_id: User ID from URL path
        conversation_id: Conversation ID
        limit: Maximum number of messages to return (default 100)

    Returns:
        List of MessageDTO objects
    """
    # Verify JWT and user access
    verify_user_access(user_id, token_user_id)

    try:
        chat_service = ChatService(session)
        messages = await chat_service.get_messages(
            conversation_id=conversation_id,
            user_id=user_id,
            limit=limit,
        )

        return [
            MessageDTO(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                tool_calls=msg.tool_calls,
                created_at=msg.created_at,
            )
            for msg in messages
        ]

    except Exception as e:
        logger.error(
            f"Error getting messages for conversation {conversation_id}, user {user_id}: {e}",
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve messages"
        )
