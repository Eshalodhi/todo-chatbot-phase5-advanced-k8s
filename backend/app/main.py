"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, KAFKA_ENABLED
from app.database import create_db_and_tables
from app.routers import auth, tasks, chat, tags
# Import all models so SQLModel creates all tables
from app.models import User, Task, Conversation, Message  # noqa: F401
# Phase V models
from app.models import Reminder, Tag, TaskTag, ProcessedEvent  # noqa: F401

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler - creates tables on startup, initializes Kafka producer."""
    # Create database tables
    create_db_and_tables()

    # Initialize Kafka producer if enabled
    producer = None
    if KAFKA_ENABLED:
        try:
            from app.events.producer import create_producer, set_producer, close_producer
            producer = await create_producer()
            set_producer(producer)
            logger.info("Kafka producer initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize Kafka producer: {e}. Events will not be published.")

    yield

    # Cleanup Kafka producer
    if producer:
        from app.events.producer import close_producer, set_producer
        await close_producer(producer)
        set_producer(None)
        logger.info("Kafka producer closed")


app = FastAPI(
    title="TaskFlow API",
    description="Backend API for TaskFlow multi-user task management application",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Register routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(chat.router)
app.include_router(tags.router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}
