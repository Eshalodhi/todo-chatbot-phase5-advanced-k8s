"""Application configuration from environment variables."""

import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "")
BETTER_AUTH_SECRET: str = os.getenv("BETTER_AUTH_SECRET", "")
CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

# OAuth Configuration
GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")

# Frontend URL for OAuth redirects
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Password reset token expiration (in minutes)
RESET_TOKEN_EXPIRY_MINUTES: int = int(os.getenv("RESET_TOKEN_EXPIRY_MINUTES", "60"))

# JWT token expiration settings
JWT_EXPIRATION_DAYS_DEFAULT: int = 1  # Default: 1 day
JWT_EXPIRATION_DAYS_REMEMBER: int = 30  # With "remember me": 30 days

# Phase III - Cohere AI Configuration
COHERE_API_KEY: str = os.getenv("COHERE_API_KEY", "")
COHERE_MODEL: str = os.getenv("COHERE_MODEL", "command-r-plus-08-2024")
COHERE_TEMPERATURE: float = float(os.getenv("COHERE_TEMPERATURE", "0.3"))
COHERE_MAX_HISTORY: int = int(os.getenv("COHERE_MAX_HISTORY", "20"))

# Phase V - Kafka Configuration
KAFKA_BROKERS: str = os.getenv("KAFKA_BROKERS", "localhost:9092")
KAFKA_ENABLED: bool = os.getenv("KAFKA_ENABLED", "false").lower() == "true"

# Phase V - SMTP Configuration (for notifications)
SMTP_HOST: str = os.getenv("SMTP_HOST", "")
SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER: str = os.getenv("SMTP_USER", "")
SMTP_PASS: str = os.getenv("SMTP_PASS", "")
SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "noreply@todoapp.com")

# Validation
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

if not BETTER_AUTH_SECRET:
    raise ValueError("BETTER_AUTH_SECRET environment variable is required")
