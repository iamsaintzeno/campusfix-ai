import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from models import Issue


DATABASE_PATH = Path(__file__).with_name("campusfix.db")


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS issues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                location TEXT NOT NULL,
                category TEXT NOT NULL CHECK (category IN (
                    'Electrical', 'Network', 'Cleanliness', 'Water', 'Furniture', 'Other'
                )),
                priority TEXT NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
                summary TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Open'
                    CHECK (status IN ('Open', 'Resolved')),
                created_at TEXT NOT NULL
            )
            """
        )
        if connection.execute("SELECT COUNT(*) FROM issues").fetchone()[0] == 0:
            connection.executemany(
                """
                INSERT INTO issues
                    (title, description, location, category, priority, summary, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'Open', ?)
                """,
                [
                    (
                        "Wi-Fi not working in Lab 3",
                        "The Wi-Fi is unavailable for all computers in the lab.",
                        "Computer Lab 3",
                        "Network",
                        "High",
                        "Wi-Fi unavailable for computers in Computer Lab 3",
                        _now(),
                    ),
                    (
                        "Broken fan in Room 204",
                        "The ceiling fan has stopped working during class.",
                        "Room 204",
                        "Electrical",
                        "Medium",
                        "Broken ceiling fan in Room 204",
                        _now(),
                    ),
                    (
                        "Water leakage near Block B",
                        "Water is leaking from a pipe near the hallway.",
                        "Block B hallway",
                        "Water",
                        "High",
                        "Water leaking from a pipe in the Block B hallway",
                        _now(),
                    ),
                    (
                        "Dirty classroom in Block A",
                        "The classroom needs cleaning after the previous session.",
                        "Block A, Room 108",
                        "Cleanliness",
                        "Medium",
                        "Classroom needs cleaning in Block A, Room 108",
                        _now(),
                    ),
                ],
            )


def list_issues() -> list[Issue]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM issues ORDER BY created_at DESC, id DESC"
        ).fetchall()
    return [Issue(**dict(row)) for row in rows]


def create_issue(
    title: str,
    description: str,
    location: str,
    category: str,
    priority: str,
    summary: str,
) -> Issue:
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO issues (title, description, location, category, priority, summary, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'Open', ?)
            """,
            (title, description, location, category, priority, summary, _now()),
        )
        row = connection.execute(
            "SELECT * FROM issues WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return Issue(**dict(row))


def resolve_issue(issue_id: int) -> Issue | None:
    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE issues SET status = 'Resolved' WHERE id = ?", (issue_id,)
        )
        if cursor.rowcount == 0:
            return None
        row = connection.execute(
            "SELECT * FROM issues WHERE id = ?", (issue_id,)
        ).fetchone()
    return Issue(**dict(row))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
