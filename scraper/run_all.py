"""
run_all.py — Master script: runs all scrapers in the right order, then cleans.

Order:
  1. OSM (free, no key, runs first to establish baseline)
  2. Booksy (primary source, richest data)
  3. Google Places (gap-fill + rating enrichment) — requires GOOGLE_API_KEY
  4. clean.py (normalise + dedup + report)

Usage:
  # Without Google Places (still gets 100+ from Booksy + OSM):
  python run_all.py

  # With Google Places enrichment:
  GOOGLE_API_KEY=your_key python run_all.py

  # Skip specific scrapers:
  python run_all.py --skip osm --skip google
"""

import argparse
import importlib
import logging
import os
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [run_all] %(message)s")
log = logging.getLogger(__name__)

STEPS = [
    ("osm",    "osm_scraper",    None),
    ("booksy", "booksy_scraper", None),
    ("google", "google_places_scraper", "GOOGLE_API_KEY"),
    ("clean",  "clean",          None),
]


def main():
    parser = argparse.ArgumentParser(description="Run all Warsaw salon scrapers")
    parser.add_argument(
        "--skip",
        action="append",
        default=[],
        metavar="STEP",
        help="Skip a step by name (osm, booksy, google, clean). Repeatable.",
    )
    args = parser.parse_args()

    # Ensure we're in the scraper directory
    os.chdir(Path(__file__).parent)

    for step_name, module_name, env_key in STEPS:
        if step_name in args.skip:
            log.info(f"── Skipping {step_name} (--skip flag) ──")
            continue

        if env_key and not os.environ.get(env_key):
            log.warning(f"── Skipping {step_name}: {env_key} not set ──")
            continue

        log.info(f"══ Starting step: {step_name} ══")
        try:
            mod = importlib.import_module(module_name)
            if step_name == "clean":
                # clean.py has a main() entrypoint
                mod.main()
            else:
                mod.run()
        except Exception as e:
            log.error(f"Step {step_name} failed: {e}", exc_info=True)
            log.warning(f"Continuing with next step…")

    log.info("All steps complete. Check data/salons.db")


if __name__ == "__main__":
    main()
