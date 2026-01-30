"""
Chat service implementing the 9-step stateless flow.

This service orchestrates the chat functionality, handling:
- Conversation management
- Message persistence
- Cohere API calls
- Tool execution
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional, Any

from sqlmodel import Session, select

from app.config import COHERE_MAX_HISTORY
from app.models import Conversation, Message
from app.schemas import ChatResponseDTO, ToolCallResultDTO
from app.services.chat.cohere_client import CohereClient
from app.services.chat.tools.executor import ToolExecutor
from app.services.chat.tools.base import ToolResult

logger = logging.getLogger(__name__)


class ChatService:
    """
    Orchestrates the 9-step stateless chat flow.

    Steps:
    1. Receive message (handled by router)
    2. Verify JWT (handled by router dependency)
    3. Load or create conversation
    4. Load chat history (max 20 messages)
    5. Store user message
    6. Call Cohere API with tools
    7. Execute tool calls if any
    8. Store AI response
    9. Return response
    """

    def __init__(self, session: Session):
        """
        Initialize the chat service.

        Args:
            session: Database session for persistence
        """
        self.session = session
        self.cohere = CohereClient()
        self.executor = ToolExecutor(session)

    async def process_message(
        self,
        user_id: str,
        message: str,
        conversation_id: Optional[int] = None
    ) -> ChatResponseDTO:
        """
        Process a user message through the 9-step flow.

        Args:
            user_id: User ID from JWT
            message: User's message text
            conversation_id: Optional existing conversation ID

        Returns:
            ChatResponseDTO with AI response and tool results
        """
        # Step 3: Get or create conversation
        conversation = await self._get_or_create_conversation(user_id, conversation_id)

        # Step 4: Load history
        history = await self._load_history(conversation.id, user_id)

        # Step 5: Store user message
        await self._store_message(conversation.id, user_id, "user", message)

        # Step 6: Build messages and call Cohere
        messages = self.cohere.build_messages(history, message)
        response = self.cohere.chat(messages)

        # Step 7: Execute tool calls if any
        tool_results: list[ToolCallResultDTO] = []
        if self.cohere.has_tool_calls(response):
            # Append assistant's tool call request to messages
            messages.append({
                "role": "assistant",
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    }
                    for tc in response.message.tool_calls
                ]
            })

            # Execute each tool call
            for tool_call_id, tool_name, parameters in self.cohere.get_tool_calls(response):
                result = await self.executor.execute(tool_name, user_id, parameters)

                # Format for response
                tool_results.append(ToolCallResultDTO(
                    tool=tool_name,
                    success=result.success,
                    result=result.data,
                    error=None if result.success else result.message
                ))

                # Append tool result to messages for Cohere
                messages.append(self.cohere.format_tool_result(tool_call_id, result.to_dict()))

            # Call Cohere again with tool results to get final response
            response = self.cohere.chat(messages, include_tools=True)

        # Get the text response
        response_text = self.cohere.get_response_text(response)

        # Step 8: Store assistant response
        tool_calls_data = None
        if tool_results:
            tool_calls_data = [r.model_dump() for r in tool_results]

        await self._store_message(
            conversation.id,
            user_id,
            "assistant",
            response_text,
            tool_calls=tool_calls_data
        )

        # Update conversation title if it's the first message
        if not conversation.title and message:
            # Use first 50 chars of message as title
            conversation.title = message[:50] + ("..." if len(message) > 50 else "")
            conversation.updated_at = datetime.now(timezone.utc)
            self.session.add(conversation)
            self.session.commit()

        # Step 9: Return response
        return ChatResponseDTO(
            conversation_id=conversation.id,
            response=response_text,
            tool_calls=tool_results
        )

    async def _get_or_create_conversation(
        self,
        user_id: str,
        conversation_id: Optional[int]
    ) -> Conversation:
        """
        Get existing conversation or create a new one.

        Args:
            user_id: User ID for isolation
            conversation_id: Optional existing conversation ID

        Returns:
            Conversation object
        """
        if conversation_id:
            # Try to load existing conversation with user isolation
            query = (
                select(Conversation)
                .where(Conversation.id == conversation_id)
                .where(Conversation.user_id == user_id)
            )
            conversation = self.session.exec(query).first()

            if conversation:
                # Update timestamp
                conversation.updated_at = datetime.now(timezone.utc)
                self.session.add(conversation)
                self.session.commit()
                return conversation

            logger.warning(f"Conversation {conversation_id} not found for user {user_id}, creating new")

        # Create new conversation
        conversation = Conversation(user_id=user_id)
        self.session.add(conversation)
        self.session.commit()
        self.session.refresh(conversation)

        logger.info(f"Created conversation {conversation.id} for user {user_id}")
        return conversation

    async def _load_history(
        self,
        conversation_id: int,
        user_id: str
    ) -> list[dict[str, Any]]:
        """
        Load recent chat history for context.

        Args:
            conversation_id: Conversation to load from
            user_id: User ID for isolation

        Returns:
            List of message dictionaries
        """
        query = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .where(Message.user_id == user_id)
            .order_by(Message.created_at.desc())
            .limit(COHERE_MAX_HISTORY)
        )
        messages = list(self.session.exec(query).all())

        # Reverse to chronological order
        messages.reverse()

        # Format for Cohere
        history = []
        for msg in messages:
            if msg.role in ["user", "assistant"]:
                history.append({
                    "role": msg.role,
                    "content": msg.content
                })

        return history

    async def _store_message(
        self,
        conversation_id: int,
        user_id: str,
        role: str,
        content: str,
        tool_calls: Optional[dict] = None,
        tool_call_id: Optional[str] = None
    ) -> Message:
        """
        Store a message in the database.

        Args:
            conversation_id: Conversation ID
            user_id: User ID for isolation
            role: Message role (user, assistant, tool)
            content: Message content
            tool_calls: Optional tool call data
            tool_call_id: Optional tool call ID

        Returns:
            Created Message object
        """
        message = Message(
            conversation_id=conversation_id,
            user_id=user_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
            tool_call_id=tool_call_id
        )
        self.session.add(message)
        self.session.commit()
        self.session.refresh(message)

        return message

    async def get_conversations(
        self,
        user_id: str,
        limit: int = 50
    ) -> list[Conversation]:
        """
        Get all conversations for a user.

        Args:
            user_id: User ID for isolation
            limit: Maximum conversations to return

        Returns:
            List of Conversation objects
        """
        query = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        return list(self.session.exec(query).all())

    async def get_messages(
        self,
        conversation_id: int,
        user_id: str,
        limit: int = 100
    ) -> list[Message]:
        """
        Get messages for a conversation.

        Args:
            conversation_id: Conversation ID
            user_id: User ID for isolation
            limit: Maximum messages to return

        Returns:
            List of Message objects
        """
        query = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .where(Message.user_id == user_id)
            .order_by(Message.created_at.asc())
            .limit(limit)
        )
        return list(self.session.exec(query).all())
