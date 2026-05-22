"""
booksy_scraper.py — Scrapes hair/beauty salons in Warsaw from Booksy's internal API.

How it works:
  Booksy's website calls their own REST API under /api/pl/2/business_api/businesses/.
  We replicate those requests across a grid of district center coordinates so we
  cover the whole city rather than just the central radius.

Usage:
  python booksy_scraper.py

Requirements:
  pip install requests
"""

import time
import logging
import requests
from db import init_db, upsert_salon, count_salons

logging.basicConfig(level=logging.INFO, format="%(asctime)s [booksy] %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BASE_URL = "https://booksy.com/api/pl/2/business_api/businesses/"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
    "Referer": "https://booksy.com/",
    # Booksy's public web API key — visible in any browser network tab on booksy.com
    "X-Api-Key": "web-e3d812bf-d6a8-4d21-a9b9-bd3a8c3e9241",
}

# Warsaw district centres: (district_name, lat, lon)
WARSAW_DISTRICTS = [
    ("Śródmieście",   52.2297, 21.0122),
    ("Mokotów",       52.1955, 21.0222),
    ("Wola",          52.2350, 20.9800),
    ("Ochota",        52.2200, 20.9900),
    ("Żoliborz",      52.2700, 21.0000),
    ("Praga-Południe",52.2400, 21.0700),
    ("Praga-Północ",  52.2550, 21.0500),
    ("Bielany",       52.3000, 20.9500),
    ("Bemowo",        52.2500, 20.9000),
    ("Ursynów",       52.1600, 21.0400),
    ("Wilanów",       52.1650, 21.0900),
    ("Targówek",      52.2800, 21.0700),
    ("Białołęka",     52.3200, 21.0000),
    ("Wawer",         52.2000, 21.1500),
    ("Włochy",        52.2000, 20.9300),
    ("Ursus",         52.2000, 20.8900),
    ("Rembertów",     52.2500, 21.1500),
    ("Wesoła",        52.2500, 21.2000),
]

SEARCH_QUERIES = ["salon fryzjerski", "salon kosmetyczny", "fryzjer", "barber", "beauty"]
RADIUS_METERS = 3000
PAGE_SIZE = 100  # Booksy max per request
REQUEST_DELAY = 1.2  # seconds between requests — be polite


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def map_category(business: dict) -> str:
    """Extract a clean comma-separated services string from Booksy's category tree."""
    cats = business.get("categories", [])
    if isinstance(cats, list):
        return ", ".join(c.get("name", "") for c in cats if c.get("name"))
    return ""


def map_price_range(business: dict) -> str | None:
    """Convert Booksy price tier (1-4) to $ symbols."""
    tier = business.get("price_range_tier")
    if tier:
        return "$" * int(tier)
    return None


def infer_district(address: str, fallback: str) -> str:
    """
    Try to extract the Warsaw district from the address string.
    Booksy sometimes includes it explicitly; otherwise use the search district.
    """
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


def fetch_page(lat: float, lon: float, query: str, offset: int) -> dict | None:
    params = {
        "lat": lat,
        "lon": lon,
        "radius": RADIUS_METERS,
        "query": query,
        "limit": PAGE_SIZE,
        "offset": offset,
        "category": "1",        # 1 = hair & beauty on Booksy PL
    }
    try:
        r = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        log.warning(f"HTTP {e.response.status_code} for {query!r} offset={offset}: {e}")
    except Exception as e:
        log.warning(f"Request failed: {e}")
    return None


# ---------------------------------------------------------------------------
# Main scraping logic
# ---------------------------------------------------------------------------

def scrape_district(district_name: str, lat: float, lon: float) -> int:
    """Scrape all salons for a single district across all search queries."""
    saved = 0

    for query in SEARCH_QUERIES:
        offset = 0
        while True:
            log.info(f"{district_name} | q='{query}' | offset={offset}")
            data = fetch_page(lat, lon, query, offset)

            if not data:
                break

            businesses = data.get("businesses", [])
            if not businesses:
                break

            for biz in businesses:
                address_parts = [
                    biz.get("address", ""),
                    biz.get("city", ""),
                ]
                address = ", ".join(p for p in address_parts if p).strip()

                if not address:
                    continue  # skip incomplete records

                salon = {
                    "name":         biz.get("name", "").strip(),
                    "address":      address,
                    "district":     infer_district(address, district_name),
                    "phone":        biz.get("phone"),
                    "website":      biz.get("url") or biz.get("website"),
                    "services":     map_category(biz),
                    "price_range":  map_price_range(biz),
                    "rating":       biz.get("rating", {}).get("score") if isinstance(biz.get("rating"), dict) else biz.get("score"),
                    "review_count": biz.get("rating", {}).get("count") if isinstance(biz.get("rating"), dict) else biz.get("count"),
                    "source":       "booksy",
                    "source_id":    str(biz.get("id", "")),
                    "source_url":   f"https://booksy.com/pl-pl/s/{biz.get('slug', '')}",
                    "latitude":     biz.get("location", {}).get("latitude"),
                    "longitude":    biz.get("location", {}).get("longitude"),
                }

                if not salon["name"]:
                    continue

                try:
                    upsert_salon(salon)
                    saved += 1
                except Exception as e:
                    log.debug(f"Upsert failed for {salon['name']!r}: {e}")

            # Paginate
            total = data.get("total", 0)
            offset += PAGE_SIZE
            if offset >= total or offset >= 500:  # safety cap
                break

            time.sleep(REQUEST_DELAY)

        time.sleep(REQUEST_DELAY)

    return saved


def run():
    init_db()
    total_saved = 0

    for district_name, lat, lon in WARSAW_DISTRICTS:
        n = scrape_district(district_name, lat, lon)
        total_saved += n
        log.info(f"✓ {district_name}: +{n} records saved this district")
        time.sleep(REQUEST_DELAY * 2)

    stats = count_salons()
    log.info(f"=== Done. Total in DB: {stats['total']} | By source: {stats['by_source']} ===")


if __name__ == "__main__":
    run()
