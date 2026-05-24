"""
clean.py — Post-scrape data cleaning and deduplication for Warsaw Salon Explorer.

What this does:
  1. Normalises names and addresses (trim, fix casing, remove double spaces)
  2. Detects near-duplicate records across sources using fuzzy matching
  3. Merges duplicates: keeps the richer record, fills gaps from the other
  4. Flags records with missing required fields so they can be reviewed
  5. Exports a clean summary report

Usage:
  python clean.py [--dry-run]

Requirements:
  pip install rapidfuzz
"""

import argparse
import logging
import re
import sqlite3
from db import get_connection, DB_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s [clean] %(message)s")
log = logging.getLogger(__name__)

try:
    from rapidfuzz import fuzz
    FUZZY_AVAILABLE = True
except ImportError:
    log.warning("rapidfuzz not installed — fuzzy dedup disabled. pip install rapidfuzz")
    FUZZY_AVAILABLE = False

FUZZY_THRESHOLD = 88  # similarity score (0–100) above which we consider two records dupes


# ---------------------------------------------------------------------------
# Step 1: Normalise text fields
# ---------------------------------------------------------------------------

def normalise_name(name: str) -> str:
    if not name:
        return name
    name = name.strip()
    name = re.sub(r"\s+", " ", name)
    # Fix all-caps (e.g. "SALON VENUS" → "Salon Venus")
    if name == name.upper() and len(name) > 3:
        name = name.title()
    return name


def normalise_address(address: str) -> str:
    if not address:
        return address
    address = address.strip()
    address = re.sub(r"\s+", " ", address)
    # Normalise common abbreviations
    address = re.sub(r"\bul\.\s*", "ul. ", address, flags=re.IGNORECASE)
    address = re.sub(r"\bal\.\s*", "al. ", address, flags=re.IGNORECASE)
    return address


def normalise_phone(phone: str) -> str | None:
    if not phone:
        return None
    # Strip everything except digits and leading +
    digits = re.sub(r"[^\d+]", "", phone)
    # Normalise to +48XXXXXXXXX format
    if digits.startswith("48") and len(digits) == 11:
        digits = "+" + digits
    elif not digits.startswith("+") and len(digits) == 9:
        digits = "+48" + digits
    return digits


def run_normalise(dry_run: bool = False):
    log.info("Step 1: Normalising text fields…")
    with get_connection() as conn:
        rows = conn.execute("SELECT id, name, address, phone FROM salons").fetchall()
        updates = 0
        for row in rows:
            new_name    = normalise_name(row["name"])
            new_address = normalise_address(row["address"])
            new_phone   = normalise_phone(row["phone"])

            if (new_name, new_address, new_phone) != (row["name"], row["address"], row["phone"]):
                if not dry_run:
                    conn.execute(
                        "UPDATE salons SET name=?, address=?, phone=?, updated_at=datetime('now') WHERE id=?",
                        (new_name, new_address, new_phone, row["id"]),
                    )
                updates += 1

    log.info(f"  Normalised {updates} records")


# ---------------------------------------------------------------------------
# Step 2: Fuzzy deduplication across sources
# ---------------------------------------------------------------------------

def similarity(a: str, b: str) -> float:
    """Combined token_sort + partial ratio for robust address/name matching."""
    return max(
        fuzz.token_sort_ratio(a, b),
        fuzz.partial_ratio(a, b),
    )


def find_duplicate_pairs(conn: sqlite3.Connection) -> list[tuple[int, int]]:
    """
    Returns list of (keep_id, drop_id) pairs where drop_id should be merged into keep_id.
    'keep' is the record with more data (higher source priority: booksy > google > osm).
    """
    source_priority = {"booksy": 0, "google": 1, "osm": 2}

    rows = conn.execute(
        "SELECT id, name, address, source FROM salons ORDER BY id"
    ).fetchall()

    pairs: list[tuple[int, int]] = []
    seen_ids: set[int] = set()

    for i, row_a in enumerate(rows):
        if row_a["id"] in seen_ids:
            continue
        for row_b in rows[i + 1:]:
            if row_b["id"] in seen_ids:
                continue

            name_sim    = similarity(row_a["name"], row_b["name"])
            address_sim = similarity(row_a["address"], row_b["address"])

            # Both name AND address must be similar for it to be a true duplicate
            if name_sim >= FUZZY_THRESHOLD and address_sim >= FUZZY_THRESHOLD:
                prio_a = source_priority.get(row_a["source"], 99)
                prio_b = source_priority.get(row_b["source"], 99)

                keep_id = row_a["id"] if prio_a <= prio_b else row_b["id"]
                drop_id = row_b["id"] if keep_id == row_a["id"] else row_a["id"]

                log.debug(
                    f"Dupe: '{row_a['name']}' ({row_a['source']}) ≈ '{row_b['name']}' ({row_b['source']}) "
                    f"— name_sim={name_sim:.0f} addr_sim={address_sim:.0f}"
                )

                pairs.append((keep_id, drop_id))
                seen_ids.add(drop_id)
                break  # one match per record is enough

    return pairs


def merge_record(conn: sqlite3.Connection, keep_id: int, drop_id: int):
    """
    Fill any NULL fields in keep_id with non-NULL values from drop_id, then delete drop_id.
    """
    enrichable = ["phone", "website", "services", "price_range",
                  "rating", "review_count", "latitude", "longitude"]

    keep = dict(conn.execute("SELECT * FROM salons WHERE id=?", (keep_id,)).fetchone())
    drop = dict(conn.execute("SELECT * FROM salons WHERE id=?", (drop_id,)).fetchone())

    updates = {}
    for field in enrichable:
        if keep.get(field) is None and drop.get(field) is not None:
            updates[field] = drop[field]

    if updates:
        set_clause = ", ".join(f"{k}=?" for k in updates)
        conn.execute(
            f"UPDATE salons SET {set_clause}, updated_at=datetime('now') WHERE id=?",
            (*updates.values(), keep_id),
        )

    conn.execute("DELETE FROM salons WHERE id=?", (drop_id,))


def run_dedup(dry_run: bool = False):
    if not FUZZY_AVAILABLE:
        log.warning("Skipping fuzzy dedup (rapidfuzz not installed)")
        return

    log.info("Step 2: Finding duplicate records…")
    with get_connection() as conn:
        pairs = find_duplicate_pairs(conn)
        log.info(f"  Found {len(pairs)} duplicate pairs")

        if not dry_run:
            for keep_id, drop_id in pairs:
                merge_record(conn, keep_id, drop_id)
            log.info(f"  Merged and deleted {len(pairs)} duplicates")
        else:
            log.info("  Dry run — no changes made")


# ---------------------------------------------------------------------------
# Step 3: Flag incomplete records
# ---------------------------------------------------------------------------

def run_quality_report():
    log.info("Step 3: Data quality report")
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM salons").fetchone()[0]

        checks = {
            "Missing phone":        "phone IS NULL",
            "Missing website":      "website IS NULL",
            "Missing services":     "services IS NULL OR services = ''",
            "Missing price_range":  "price_range IS NULL",
            "Missing rating":       "rating IS NULL",
            "Missing coordinates":  "latitude IS NULL OR longitude IS NULL",
        }

        print("\n─── Data Quality Report ─────────────────────────────")
        print(f"Total salons: {total}")
        print()

        for label, condition in checks.items():
            count = conn.execute(f"SELECT COUNT(*) FROM salons WHERE {condition}").fetchone()[0]
            pct = 100 * count / total if total else 0
            bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
            print(f"  {label:<25} {bar} {count}/{total} ({pct:.0f}%)")

        by_source = conn.execute(
            "SELECT source, COUNT(*) as n FROM salons GROUP BY source ORDER BY n DESC"
        ).fetchall()
        print()
        print("  By source:")
        for row in by_source:
            print(f"    {row['source']:<12} {row['n']}")

        by_district = conn.execute(
            "SELECT district, COUNT(*) as n FROM salons GROUP BY district ORDER BY n DESC LIMIT 10"
        ).fetchall()
        print()
        print("  Top 10 districts:")
        for row in by_district:
            print(f"    {row['district']:<30} {row['n']}")
        print("─────────────────────────────────────────────────────\n")


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Clean and deduplicate salon data")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing")
    args = parser.parse_args()

    log.info(f"Working on {DB_PATH}")
    run_normalise(dry_run=args.dry_run)
    run_dedup(dry_run=args.dry_run)
    run_quality_report()
    log.info("Done.")


if __name__ == "__main__":
    main()
