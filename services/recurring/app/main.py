"""
Recurring Task Service - FastAPI application entry point.

Listens for task.completed events and creates new task instances
for recurring tasks.
Per specs/phase5/plan.md - Stage 2 Recurring Task Microservice.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from app.consumer import start_consumer, stop_consumer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger.info("Starting Recurring Task Service...")

    # Start Kafka consumer
    await start_consumer()

    logger.info("Recurring Task Service started successfully")
    yield

    # Cleanup
    logger.info("Shutting down Recurring Task Service...")
    await stop_consumer()
    logger.info("Recurring Task Service stopped")


app = FastAPI(
    title="Recurring Task Service",
    description="Handles automatic recurring task creation for the TaskFlow application",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "recurring"}
