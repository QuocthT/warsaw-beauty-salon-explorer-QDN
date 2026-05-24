"""
db.py — SQLite schema and helper functions for Warsaw Salon Explorer.
All scrapers write through this module so the schema stays consistent.
"""

import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "data" / "salons.db"


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Create tables if they don't exist yet."""
    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS salons (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,

                -- Required fields
                name            TEXT NOT NULL,
                address         TEXT NOT NULL,
                district        TEXT NOT NULL,

                -- Nice-to-have fields
                phone           TEXT,
                website         TEXT,
                services        TEXT,       -- comma-separated list
                price_range     TEXT,       -- e.g. "$", "$$", "$$$"
                rating          REAL,
                review_count    INTEGER,

                -- Source tracking
                source          TEXT NOT NULL,   -- 'booksy' | 'google' | 'osm'
                source_id       TEXT,            -- external ID from that platform
                source_url      TEXT,

                -- Coordinates (useful for future map features)
                latitude        REAL,
                longitude       REAL,

                -- Metadata
                created_at      TEXT DEFAULT (datetime('now')),
                updated_at      TEXT DEFAULT (datetime('now'))
            );

            -- Deduplicate on (name, address) pair — same salon from two sources
            CREATE UNIQUE INDEX IF NOT EXISTS idx_salons_name_address
                ON salons (name, address);

            -- Fast filtering queries
            CREATE INDEX IF NOT EXISTS idx_salons_district  ON salons (district);
            CREATE INDEX IF NOT EXISTS idx_salons_source    ON salons (source);
            CREATE INDEX IF NOT EXISTS idx_salons_rating    ON salons (rating);
        """)
    print(f"[db] Database ready at {DB_PATH}")


def upsert_salon(data: dict) -> int:
    """
    Insert a salon or update the existing row if (name, address) already exists.
    Returns the row id.
    """
    required = {"name", "address", "district", "source"}
    missing = required - data.keys()
    if missing:
        raise ValueError(f"Missing required fields: {missing}")

    cols = [
        "name", "address", "district",
        "phone", "website", "services", "price_range",
        "rating", "review_count",
        "source", "source_id", "source_url",
        "latitude", "longitude",
    ]

    fields   = [c for c in cols if c in data]
    values   = [data[c] for c in fields]
    placeholders = ", ".join("?" * len(fields))
    col_list = ", ".join(fields)

    # ON CONFLICT: update everything except source/source_id of the winner
    update_pairs = ", ".join(
        f"{c} = excluded.{c}"
        for c in fields
        if c not in ("name", "address", "source", "source_id")
    )
    update_pairs += ", updated_at = datetime('now')"

    sql = f"""
        INSERT INTO salons ({col_list})
        VALUES ({placeholders})
        ON CONFLICT (name, address) DO UPDATE SET {update_pairs}
    """

    with get_connection() as conn:
        cur = conn.execute(sql, values)
        return cur.lastrowid


def count_salons() -> dict:
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM salons").fetchone()[0]
        by_source = conn.execute(
            "SELECT source, COUNT(*) as n FROM salons GROUP BY source ORDER BY n DESC"
        ).fetchall()
        return {
            "total": total,
            "by_source": {row["source"]: row["n"] for row in by_source},
        }


if __name__ == "__main__":
    init_db()
    stats = count_salons()
    print(f"Total salons: {stats['total']}")
    print(f"By source:    {stats['by_source']}")
