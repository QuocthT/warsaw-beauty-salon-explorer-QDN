"""
booksy_scraper.py — Scrapes hair/beauty salons in Warsaw from Booksy.

Endpoint: /core/v2/customer_api/businesses/ (discovered via DevTools)

Response structure (confirmed via debug_booksy.py):
  - businesses[]            list of business objects
  - businesses_count        total results (NOT 'total')
  - location.coordinate.latitude/longitude  (NOT location.latitude)
  - reviews_rank            rating score  (NOT rating.score)
  - reviews_count           review count  (NOT rating.count)
  - regions[]               array with type='neighborhood' for district
"""

import time
import logging
import requests
from db import init_db, upsert_salon, count_salons

logging.basicConfig(level=logging.INFO, format="%(asctime)s [booksy] %(message)s")
log = logging.getLogger(__name__)

BASE_URL = "https://pl.booksy.com/core/v2/customer_api/businesses/"

HEADERS = {
    "User-Agent":         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
    "Accept":             "application/json, text/plain, */*",
    "Accept-Language":    "en-PL, en",
    "Accept-Encoding":    "gzip, deflate, br, zstd",
    "Cache-Control":      "no-cache",
    "Pragma":             "no-cache",
    "Origin":             "https://booksy.com",
    "Referer":            "https://booksy.com/",
    "Sec-Ch-Ua":          '"Chromium";v="148", "Microsoft Edge";v="148", "Not/A)Brand";v="99"',
    "Sec-Ch-Ua-Mobile":   "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest":     "empty",
    "Sec-Fetch-Mode":     "cors",
    "Sec-Fetch-Site":     "same-site",
    "X-Api-Key":          "web-e3d812bf-d7a2-445d-ab38-55589ae6a121",
    "X-App-Version":      "3.0",
    "X-Fingerprint":      "cf58b9f9-c369-49ed-a2ed-6a859f36c97e",
}

# Warsaw district bounding boxes (name, north, east, south, west)
WARSAW_DISTRICTS = [
    ("Śródmieście",    52.250,  21.045, 52.215, 20.985),
    ("Mokotów",        52.215,  21.060, 52.170, 20.980),
    ("Wola",           52.255,  20.990, 52.215, 20.940),
    ("Ochota",         52.225,  21.005, 52.195, 20.960),
    ("Żoliborz",       52.285,  21.030, 52.250, 20.960),
    ("Praga-Południe", 52.270,  21.110, 52.220, 21.040),
    ("Praga-Północ",   52.290,  21.080, 52.250, 21.030),
    ("Bielany",        52.330,  20.990, 52.275, 20.890),
    ("Bemowo",         52.275,  20.960, 52.220, 20.870),
    ("Ursynów",        52.185,  21.075, 52.125, 20.980),
    ("Wilanów",        52.185,  21.140, 52.140, 21.055),
    ("Targówek",       52.310,  21.110, 52.265, 21.045),
    ("Białołęka",      52.370,  21.080, 52.295, 20.930),
    ("Wawer",          52.250,  21.220, 52.155, 21.090),
    ("Włochy",         52.220,  20.960, 52.175, 20.885),
    ("Ursus",          52.225,  20.900, 52.185, 20.840),
    ("Rembertów",      52.280,  21.200, 52.220, 21.120),
    ("Wesoła",         52.290,  21.280, 52.220, 21.180),
]

SEARCH_QUERIES = ["salon", "fryzjer", "barber", "beauty", "kosmetyczny", "paznokcie"]
PAGE_SIZE      = 50
REQUEST_DELAY  = 1.5
WARSAW_LOCATION_ID = 3


# ---------------------------------------------------------------------------
# Response field extractors — based on confirmed response structure
# ---------------------------------------------------------------------------

def extract_district(biz: dict, fallback: str) -> str:
    """Pull district from regions[] array where type == 'neighborhood'."""
    for region in biz.get("regions", []):
        if region.get("type") == "neighborhood":
            return region.get("name", fallback)
    return fallback


def extract_address(biz: dict) -> str:
    """location.address is the full formatted address string."""
    loc = biz.get("location", {})
    return loc.get("address", "").strip()


def extract_coordinates(biz: dict) -> tuple[float | None, float | None]:
    """location.coordinate.latitude / longitude (confirmed structure)."""
    coord = biz.get("location", {}).get("coordinate", {})
    return coord.get("latitude"), coord.get("longitude")


def extract_rating(biz: dict) -> tuple[float | None, int | None]:
    """reviews_rank = score, reviews_count = count (confirmed field names)."""
    rating       = biz.get("reviews_rank")
    review_count = biz.get("reviews_count")
    # Round rating to 1 decimal for consistency
    if rating is not None:
        rating = round(float(rating), 1)
    return rating, review_count


def extract_services(biz: dict) -> str:
    """Pull from treatment_services or categories."""
    services = set()
    for ts in biz.get("treatment_services", []):
        name = ts.get("name", "").strip()
        if name:
            services.add(name)
    for cat in biz.get("categories", []):
        name = cat.get("name", "").strip()
        if name:
            services.add(name)
    return ", ".join(sorted(services))


def extract_price_range(biz: dict) -> str | None:
    tier = biz.get("price_tier") or biz.get("price_range_tier")
    if tier:
        return "$" * int(tier)
    return None


# ---------------------------------------------------------------------------
# Fetching
# ---------------------------------------------------------------------------

def fetch_page(area: str, query: str, offset: int) -> dict | None:
    params = {
        "no_thumbs":                  "true",
        "with_markdown":              "1",
        "query":                      query,
        "include_ext_listing":        "0",
        "include_venues":             "1",
        "include_seo_metadata":       "1",
        "include_b_listing":          "1",
        "include_details":            "1",
        "include_treatment_services": "1",
        "response_type":              "listing_web",
        "location_id":                WARSAW_LOCATION_ID,
        "area":                       area,
        "offset":                     offset,
        "size":                       PAGE_SIZE,
    }
    try:
        r = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=15)
        if r.status_code == 403:
            log.error("403 — X-Fingerprint expired. Grab a fresh one from DevTools on booksy.com.")
            return None
        r.raise_for_status()
        return r.json()
    except requests.HTTPError as e:
        log.warning(f"HTTP {e.response.status_code} for query={query!r} offset={offset}")
    except Exception as e:
        log.warning(f"Request error: {e}")
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def scrape_district(district_name: str, north: float, east: float,
                    south: float, west: float) -> int:
    area  = f"{north},{east},{south},{west}"
    saved = 0

    for query in SEARCH_QUERIES:
        offset = 0
        while True:
            log.info(f"{district_name} | q='{query}' | offset={offset}")
            data = fetch_page(area, query, offset)

            if not data:
                break

            businesses = data.get("businesses", [])
            if not businesses:
                break

            for biz in businesses:
                name = biz.get("name", "").strip()
                if not name:
                    continue

                address = extract_address(biz)
                if not address:
                    continue

                lat, lon         = extract_coordinates(biz)
                rating, reviews  = extract_rating(biz)
                district         = extract_district(biz, district_name)

                salon = {
                    "name":         name,
                    "address":      address,
                    "district":     district,
                    "phone":        biz.get("phone"),
                    "website":      biz.get("url") or biz.get("website"),
                    "services":     extract_services(biz),
                    "price_range":  extract_price_range(biz),
                    "rating":       rating,
                    "review_count": reviews,
                    "source":       "booksy",
                    "source_id":    str(biz.get("id", "")),
                    "source_url":   f"https://booksy.com/pl-pl/s/{biz.get('slug', '')}",
                    "latitude":     lat,
                    "longitude":    lon,
                }

                try:
                    upsert_salon(salon)
                    saved += 1
                except Exception as e:
                    log.debug(f"Upsert failed for {name!r}: {e}")

            # Pagination — use businesses_count (confirmed field name)
            total   = data.get("businesses_count", 0)
            offset += PAGE_SIZE
            if offset >= min(total, 500):
                break

            time.sleep(REQUEST_DELAY)

        time.sleep(REQUEST_DELAY)

    return saved


def run():
    init_db()
    total_saved = 0

    for district_name, north, east, south, west in WARSAW_DISTRICTS:
        n = scrape_district(district_name, north, east, south, west)
        total_saved += n
        log.info(f"✓ {district_name}: +{n}")
        time.sleep(REQUEST_DELAY * 2)

    stats = count_salons()
    log.info(f"=== Done. Total in DB: {stats['total']} | By source: {stats['by_source']} ===")


if __name__ == "__main__":
    run()
