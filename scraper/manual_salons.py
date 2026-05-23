"""
manual_salons.py — Hand-curated community & off-platform salons in Warsaw.

These are salons that are invisible to Booksy and Google Places because they:
  - Operate primarily through Facebook groups, WhatsApp, or Instagram
  - Serve specific immigrant communities (Vietnamese, Ukrainian, Afro, South Asian)
  - Are home-based or informal businesses
  - Simply never registered on booking platforms

How to verify / extend this list:
  - Search Facebook: "salon wietnamski Warszawa", "paznokcie Warszawa Wola"
  - Search Instagram: #salonwarszawa #fryzjerwarszawa #nailswarszawa
  - Ask in Facebook groups: "Wietnamczycy w Warszawie", "Ukraińcy w Warszawie"
  - Google Maps sometimes has them even if Places API misses them at district level

Usage:
  python manual_salons.py

Source is tagged 'manual' so it's transparent in the data and the UI.
"""

from db import init_db, upsert_salon, count_salons
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [manual] %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hand-curated salon list
# Format: dict with all known fields, leave unknown fields as None
#
# HOW TO ADD MORE:
#   Copy any entry below, fill in what you know, set unknown fields to None.
#   At minimum: name, address, district are required.
# ---------------------------------------------------------------------------

COMMUNITY_SALONS = [
    # Add verified, real salons here.
    # At minimum: name, address, district, source are required.
    # source should be "manual" for hand-verified entries.
]


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

def run():
    init_db()
    saved   = 0
    skipped = 0

    for salon in COMMUNITY_SALONS:
        # Remove 'notes' — not a DB column, just for our reference
        data = {k: v for k, v in salon.items() if k != "notes"}

        try:
            upsert_salon(data)
            saved += 1
            log.info(f"✓ {salon['name']} ({salon['district']}) [{salon['source']}]")
        except Exception as e:
            log.warning(f"✗ {salon['name']}: {e}")
            skipped += 1

    stats = count_salons()
    log.info(f"=== Done. Saved: {saved} | Skipped: {skipped} ===")
    log.info(f"=== Total in DB: {stats['total']} | By source: {stats['by_source']} ===")


if __name__ == "__main__":
    run()
