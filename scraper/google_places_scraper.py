"""
google_places_scraper.py — Gap-fill Warsaw salon data using Google Places API.

Strategy:
  - Run AFTER booksy_scraper.py
  - Searches each district for beauty_salon + hair_care types
  - Uses upsert so duplicates with Booksy are merged (keeps best data)
  - Handles Google's 20-result page limit with next_page_token pagination

Usage:
  export GOOGLE_API_KEY="your_key_here"
  python google_places_scraper.py

Get a free key: https://console.cloud.google.com
  Enable: Places API (legacy) — free tier gives 100 requests/month
  For this task ~60 requests total is enough.
"""

import os
import time
import logging
import requests
from db import init_db, upsert_salon, count_salons

logging.basicConfig(level=logging.INFO, format="%(asctime)s [google] %(message)s")
log = logging.getLogger(__name__)

API_KEY = os.environ.get("GOOGLE_API_KEY", "")
NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
DETAIL_URL  = "https://maps.googleapis.com/maps/api/place/details/json"

PLACE_TYPES = ["beauty_salon", "hair_care"]
RADIUS = 3000

WARSAW_DISTRICTS = [
    ("Śródmieście",    52.2297, 21.0122),
    ("Mokotów",        52.1955, 21.0222),
    ("Wola",           52.2350, 20.9800),
    ("Ochota",         52.2200, 20.9900),
    ("Żoliborz",       52.2700, 21.0000),
    ("Praga-Południe", 52.2400, 21.0700),
    ("Praga-Północ",   52.2550, 21.0500),
    ("Bielany",        52.3000, 20.9500),
    ("Bemowo",         52.2500, 20.9000),
    ("Ursynów",        52.1600, 21.0400),
    ("Wilanów",        52.1650, 21.0900),
    ("Targówek",       52.2800, 21.0700),
    ("Białołęka",      52.3200, 21.0000),
    ("Wawer",          52.2000, 21.1500),
    ("Włochy",         52.2000, 20.9300),
    ("Ursus",          52.2000, 20.8900),
]

PRICE_MAP = {1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def infer_district(address: str, fallback: str) -> str:
    known = [
        "Śródmieście", "Mokotów", "Wola", "Ochota", "Żoliborz",
        "Praga-Południe", "Praga-Północ", "Bielany", "Bemowo",
        "Ursynów", "Wilanów", "Targówek", "Białołęka", "Wawer",
        "Włochy", "Ursus", "Rembertów", "Wesoła",
    ]
    for d in known:
        if d.lower() in address.lower():
            return d
    return fallback


def fetch_nearby(lat: float, lon: float, place_type: str, page_token: str = None) -> dict | None:
    params = {
        "key": API_KEY,
        "type": place_type,
        "radius": RADIUS,
        "location": f"{lat},{lon}",
        "language": "pl",
    }
    if page_token:
        params = {"key": API_KEY, "pagetoken": page_token}

    try:
        r = requests.get(NEARBY_URL, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        log.warning(f"Nearby request failed: {e}")
    return None


def fetch_details(place_id: str) -> dict | None:
    """
    Fetch full details for a place (phone, website, opening_hours).
    Counts as one API call — use sparingly, only for promising records.
    """
    params = {
        "key": API_KEY,
        "place_id": place_id,
        "fields": "name,formatted_address,formatted_phone_number,website,opening_hours,price_level",
        "language": "pl",
    }
    try:
        r = requests.get(DETAIL_URL, params=params, timeout=15)
        r.raise_for_status()
        return r.json().get("result", {})
    except Exception as e:
        log.warning(f"Details request failed for {place_id}: {e}")
    return None


# ---------------------------------------------------------------------------
# Main scraping logic
# ---------------------------------------------------------------------------

def scrape_district(district_name: str, lat: float, lon: float) -> int:
    saved = 0

    for place_type in PLACE_TYPES:
        page_token = None
        page_num = 0

        while True:
            if page_token:
                time.sleep(2)  # Google requires a short delay before next_page_token works

            data = fetch_nearby(lat, lon, place_type, page_token)
            if not data or data.get("status") not in ("OK", "ZERO_RESULTS"):
                log.warning(f"Unexpected status: {data.get('status') if data else 'None'}")
                break

            results = data.get("results", [])
            log.info(f"{district_name} | {place_type} | page {page_num} | {len(results)} results")

            for place in results:
                address = place.get("vicinity", "")
                rating  = place.get("rating")
                reviews = place.get("user_ratings_total")

                salon = {
                    "name":         place.get("name", "").strip(),
                    "address":      address,
                    "district":     infer_district(address, district_name),
                    "rating":       rating,
                    "review_count": reviews,
                    "price_range":  PRICE_MAP.get(place.get("price_level")),
                    "source":       "google",
                    "source_id":    place.get("place_id"),
                    "source_url":   f"https://maps.google.com/?cid={place.get('place_id')}",
                    "latitude":     place.get("geometry", {}).get("location", {}).get("lat"),
                    "longitude":    place.get("geometry", {}).get("location", {}).get("lng"),
                }

                if not salon["name"] or not salon["address"]:
                    continue

                # Fetch phone + website for high-rated salons only (saves API quota)
                if rating and rating >= 4.0 and place.get("place_id"):
                    details = fetch_details(place["place_id"])
                    if details:
                        salon["phone"]   = details.get("formatted_phone_number")
                        salon["website"] = details.get("website")
                    time.sleep(0.5)

                try:
                    upsert_salon(salon)
                    saved += 1
                except Exception as e:
                    log.debug(f"Upsert failed for {salon['name']!r}: {e}")

            page_token = data.get("next_page_token")
            if not page_token:
                break

            page_num += 1
            if page_num >= 3:  # Google caps at 60 results per location anyway
                break

        time.sleep(1)

    return saved


def run():
    if not API_KEY:
        print("ERROR: Set GOOGLE_API_KEY environment variable first.")
        print("  export GOOGLE_API_KEY='your_key_here'")
        print("  Get one free at https://console.cloud.google.com")
        return

    init_db()
    total_saved = 0

    for district_name, lat, lon in WARSAW_DISTRICTS:
        n = scrape_district(district_name, lat, lon)
        total_saved += n
        log.info(f"✓ {district_name}: +{n} this district")
        time.sleep(1)

    stats = count_salons()
    log.info(f"=== Done. Total in DB: {stats['total']} | By source: {stats['by_source']} ===")


if __name__ == "__main__":
    run()
