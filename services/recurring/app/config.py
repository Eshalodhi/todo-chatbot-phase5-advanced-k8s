"""Configuration for the Recurring Task Service."""

import os
from dotenv import load_dotenv

# load_dotenv does NOT override existing env vars by default,
# but explicitly set override=False for safety in containers.
load_dotenv(override=False)

# Database
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# Kafka - split comma-separated brokers into a list
KAFKA_BROKERS: list[str] = os.getenv("KAFKA_BROKERS", "localhost:9092").split(",")
KAFKA_CONSUMER_GROUP: str = os.getenv("KAFKA_CONSUMER_GROUP", "recurring-task-service")
