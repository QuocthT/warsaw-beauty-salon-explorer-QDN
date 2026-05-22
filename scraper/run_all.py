"""
run_all.py — Master script: runs all scrapers in order, then cleans.

Order:
  1. OSM       — free baseline, no key needed
  2. Booksy    — primary source, richest data
  3. Google    — gap-fill + ratings (needs GOOGLE_API_KEY)
  4. Manual    — community/off-platform salons
  5. Clean     — normalise + dedup + quality report

Usage:
  # Without Google:
  python run_all.py

  # With Google enrichment:
  GOOGLE_API_KEY=your_key python run_all.py

  # Skip specific steps:
  python run_all.py --skip osm --skip google
"""

import argparse
import importlib
import logging
import os
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [run_all] %(message)s")
log = logging.getLogger(__name__)

STEPS = [
    ("osm",    "osm_scraper",            None),
    ("booksy", "booksy_scraper",         None),
    ("google", "google_places_scraper",  "GOOGLE_API_KEY"),
    ("manual", "manual_salons",          None),
    ("clean",  "clean",                  None),
]


def main():
    parser = argparse.ArgumentParser(description="Run all Warsaw salon scrapers")
    parser.add_argument(
        "--skip", action="append", default=[], metavar="STEP",
        help="Skip a step by name. Repeatable.",
    )
    args = parser.parse_args()

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
                mod.main()
            else:
                mod.run()
        except Exception as e:
            log.error(f"Step {step_name} failed: {e}", exc_info=True)
            log.warning("Continuing with next step…")

    log.info("All steps complete. Check data/salons.db")


if __name__ == "__main__":
    main()
