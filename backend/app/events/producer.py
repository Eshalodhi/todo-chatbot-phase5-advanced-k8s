"""
Kafka producer wrapper using aiokafka for Phase V.

Per specs/phase5/research.md
"""

import logging
import json
from typing import Any, Optional
from contextlib import asynccontextmanager

from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError

from app.config import KAFKA_BROKERS

logger = logging.getLogger(__name__)

# Global producer instance (initialized in lifespan)
_producer: Optional[AIOKafkaProducer] = None


class KafkaProducerConfig:
    """Configuration for Kafka producer."""

    # Broker addresses (comma-separated string or list)
    BOOTSTRAP_SERVERS: list[str] = (KAFKA_BROKERS or "localhost:9092").split(",")

    # Producer settings
    ACKS: str = "all"  # Wait for all replicas
    MAX_RETRIES: int = 3
    RETRY_BACKOFF_MS: int = 1000

    # Serialization
    @staticmethod
    def VALUE_SERIALIZER(v):
        return json.dumps(v).encode("utf-8")

    @staticmethod
    def KEY_SERIALIZER(k):
        return k.encode("utf-8") if k else None


async def create_producer() -> AIOKafkaProducer:
    """
    Create and start a Kafka producer.

    Returns:
        Configured AIOKafkaProducer instance
    """
    producer = AIOKafkaProducer(
        bootstrap_servers=KafkaProducerConfig.BOOTSTRAP_SERVERS,
        value_serializer=KafkaProducerConfig.VALUE_SERIALIZER,
        key_serializer=KafkaProducerConfig.KEY_SERIALIZER,
        acks=KafkaProducerConfig.ACKS,
        retries=KafkaProducerConfig.MAX_RETRIES,
        retry_backoff_ms=KafkaProducerConfig.RETRY_BACKOFF_MS,
        enable_idempotence=True,  # Prevent duplicate messages
    )
    await producer.start()
    logger.info(f"Kafka producer started, connected to {KafkaProducerConfig.BOOTSTRAP_SERVERS}")
    return producer


async def close_producer(producer: AIOKafkaProducer) -> None:
    """
    Close the Kafka producer gracefully.

    Args:
        producer: AIOKafkaProducer instance to close
    """
    if producer:
        await producer.stop()
        logger.info("Kafka producer stopped")


def get_producer() -> Optional[AIOKafkaProducer]:
    """
    Get the global Kafka producer instance.

    Returns:
        AIOKafkaProducer instance or None if not initialized
    """
    return _producer


def set_producer(producer: AIOKafkaProducer) -> None:
    """
    Set the global Kafka producer instance.

    Args:
        producer: AIOKafkaProducer instance
    """
    global _producer
    _producer = producer


async def publish_event(
    topic: str,
    event: dict[str, Any],
    key: Optional[str] = None,
) -> bool:
    """
    Publish an event to a Kafka topic.

    Args:
        topic: Kafka topic name
        event: Event data (will be JSON serialized)
        key: Optional partition key (user_id for ordering)

    Returns:
        True if published successfully, False otherwise
    """
    producer = get_producer()
    if not producer:
        logger.warning("Kafka producer not initialized, event not published")
        return False

    try:
        # Use user_id as key for per-user ordering
        partition_key = key or event.get("user_id")

        await producer.send_and_wait(
            topic=topic,
            value=event,
            key=partition_key,
        )

        logger.info(
            f"Published event to {topic}: type={event.get('event_type')}, "
            f"id={event.get('event_id')}"
        )
        return True

    except KafkaError as e:
        logger.error(f"Failed to publish event to {topic}: {e}", exc_info=True)
        return False


@asynccontextmanager
async def kafka_producer_context():
    """
    Context manager for Kafka producer lifecycle.

    Usage:
        async with kafka_producer_context() as producer:
            await publish_event(...)
    """
    producer = await create_producer()
    set_producer(producer)
    try:
        yield producer
    finally:
        await close_producer(producer)
        set_producer(None)
