"""
Notification Service - FastAPI application entry point.

Handles reminder notifications via Kafka events and scheduled checks.
Per specs/phase5/plan.md - Stage 2 Notification Microservice.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI

from app.consumer import start_consumer, stop_consumer
from app.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler."""
    logger.info("Starting Notification Service...")

    # Start Kafka consumer
    await start_consumer()

    # Start APScheduler for periodic reminder checks
    start_scheduler()

    logger.info("Notification Service started successfully")
    yield

    # Cleanup
    logger.info("Shutting down Notification Service...")
    stop_scheduler()
    await stop_consumer()
    logger.info("Notification Service stopped")


app = FastAPI(
    title="Notification Service",
    description="Handles reminder notifications for the TaskFlow application",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for monitoring."""
    return {"status": "healthy", "service": "notification"}
