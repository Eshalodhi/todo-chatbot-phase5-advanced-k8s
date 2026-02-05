"""Configuration for the Notification Service."""

import os
from dotenv import load_dotenv

# load_dotenv does NOT override existing env vars by default,
# but explicitly set override=False for safety in containers.
load_dotenv(override=False)

# Database
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# Kafka - split comma-separated brokers into a list
KAFKA_BROKERS: list[str] = os.getenv("KAFKA_BROKERS", "localhost:9092").split(",")
KAFKA_CONSUMER_GROUP: str = os.getenv("KAFKA_CONSUMER_GROUP", "notification-service")

# SMTP
SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASS: str = os.getenv("SMTP_PASS", "")
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@todoapp.com")

# Service settings
REMINDER_CHECK_INTERVAL_SECONDS: int = int(os.getenv("REMINDER_CHECK_INTERVAL_SECONDS", "60"))
MAX_RETRY_ATTEMPTS: int = 3
