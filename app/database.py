from pathlib import Path
import sqlite3
from uuid import uuid4

from sqlmodel import Session, SQLModel, create_engine


BASE_DIR = Path(__file__).resolve().parent.parent
DATABASE_PATH = BASE_DIR / "rsp_nepal.db"
DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)


def create_db_and_tables() -> None:
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    ensure_sqlite_schema()


def ensure_sqlite_schema() -> None:
    with sqlite3.connect(DATABASE_PATH) as connection:
        table_exists = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'userentry'"
        ).fetchone()
        if not table_exists:
            return

        columns = {
            row[1] for row in connection.execute("PRAGMA table_info(userentry)").fetchall()
        }

        if columns and "user_id" not in columns:
            connection.execute("ALTER TABLE userentry ADD COLUMN user_id TEXT")
            rows = connection.execute("SELECT id FROM userentry").fetchall()
            for (row_id,) in rows:
                generated_user_id = f"RSPU-{row_id:04d}-{uuid4().hex[:4].upper()}"
                connection.execute(
                    "UPDATE userentry SET user_id = ? WHERE id = ?",
                    (generated_user_id, row_id),
                )

        if columns and "password_hash" not in columns:
            connection.execute("ALTER TABLE userentry ADD COLUMN password_hash TEXT DEFAULT ''")

        connection.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_userentry_user_id ON userentry(user_id)"
        )
        connection.commit()


def get_session():
    with Session(engine) as session:
        yield session