"""Database connection and session management."""

from sqlmodel import SQLModel, Session, create_engine
from typing import Generator

from app.config import DATABASE_URL

# Create engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL debugging
    pool_pre_ping=True,  # Verify connections before use
)


def create_db_and_tables() -> None:
    """Create all database tables defined in SQLModel models."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.

    Yields:
        Session: SQLModel session for database operations
    """
    with Session(engine) as session:
        yield session
