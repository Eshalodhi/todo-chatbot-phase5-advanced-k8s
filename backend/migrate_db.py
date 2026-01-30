"""
Database migration script to add new auth columns.
Run this script to update the database schema.

Usage: python migrate_db.py
"""

from app.database import engine
from sqlalchemy import text

def migrate():
    print("Starting database migration...")

    with engine.connect() as conn:
        statements = [
            # OAuth columns
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR DEFAULT NULL",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id VARCHAR DEFAULT NULL",
            # Make password_hash nullable for OAuth users
            "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL",
            # Create index for OAuth lookups
            "CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_id)",
        ]

        for stmt in statements:
            try:
                conn.execute(text(stmt))
                print(f"  OK: {stmt[:60]}...")
            except Exception as e:
                error_str = str(e).lower()
                if "already exists" in error_str or "duplicate" in error_str:
                    print(f"  SKIP: Already applied")
                else:
                    print(f"  ERROR: {e}")

        conn.commit()
        print("\nMigration complete!")

if __name__ == "__main__":
    migrate()
