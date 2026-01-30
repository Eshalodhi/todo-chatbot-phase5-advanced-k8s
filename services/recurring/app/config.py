"""Configuration for the Recurring Task Service."""

import os
from dotenv import load_dotenv

load_dotenv()

# Database
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# Kafka
KAFKA_BROKERS: str = os.getenv("KAFKA_BROKERS", "localhost:9092")
KAFKA_CONSUMER_GROUP: str = os.getenv("KAFKA_CONSUMER_GROUP", "recurring-task-service")
