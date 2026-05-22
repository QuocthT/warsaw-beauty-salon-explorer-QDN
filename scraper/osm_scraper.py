"""
osm_scraper.py — Free, no-key scraper using OpenStreetMap's Overpass API.

Why OSM?
  - Completely free, no API key required
  - Covers community/informal salons that Booksy/Google miss
  - Especially good for Vietnamese, Ukrainian, and other immigrant-run businesses
    that rely on word-of-mouth rather than online booking platforms

Usage:
  python osm_scraper.py

OSM tags we query:
  shop=hairdresser     — hair salons & barbers
  shop=beauty          — beauty/nail/cosmetic salons
  amenity=beauty_salon — alternative tagging
"""

import time
import logging
import requests
from db import init_db, upsert_salon, count_salons

logging.basicConfig(level=logging.INFO, format="%(asctime)s [osm] %(message)s")
log = logging.getLogger(__name__)

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Warsaw bounding box (south, west, north, east)
WARSAW_BBOX = "51.9, 20.7, 52.4, 21.3"

DISTRICT_BOUNDARIES = {
    "Śródmieście":    (52.215, 20.985, 52.250, 21.045),
    "Mokotów":        (52.170, 20.980, 52.215, 21.060),
    "Wola":           (52.215, 20.940, 52.255, 20.990),
    "Ochota":         (52.195, 20.960, 52.225, 21.005),
    "Żoliborz":       (52.250, 20.960, 52.285, 21.030),
    "Praga-Południe": (52.220, 21.040, 52.270, 21.110),
    "Praga-Północ":   (52.250, 21.030, 52.290, 21.080),
    "Bielany":        (52.275, 20.890, 52.330, 20.990),
    "Bemowo":         (52.220, 20.870, 52.275, 20.960),
    "Ursynów":        (52.125, 20.980, 52.185, 21.075),
    "Wilanów":        (52.140, 21.055, 52.185, 21.140),
    "Targówek":       (52.265, 21.045, 52.310, 21.110),
    "Białołęka":      (52.295, 20.930, 52.370, 21.080),
    "Wawer":          (52.155, 21.090, 52.250, 21.220),
    "Włochy":         (52.175, 20.885, 52.220, 20.960),
    "Ursus":          (52.185, 20.840, 52.225, 20.900),
    "Rembertów":      (52.220, 21.120, 52.280, 21.200),
    "Wesoła":         (52.220, 21.180, 52.290, 21.280),
}


# ---------------------------------------------------------------------------
# Overpass query builder
# ---------------------------------------------------------------------------

def build_query(south: float, west: float, north: float, east: float) -> str:
    bbox = f"{south},{west},{north},{east}"
    return f"""
[out:json][timeout:60];
(
  node["shop"="hairdresser"]({bbox});
  node["shop"="beauty"]({bbox});
  node["amenity"="beauty_salon"]({bbox});
  way["shop"="hairdresser"]({bbox});
  way["shop"="beauty"]({bbox});
  way["amenity"="beauty_salon"]({bbox});
);
out body center;
"""


def run_overpass_query(query: str) -> dict | None:
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            r = requests.post(
                endpoint,
                data={"data": query},
                timeout=60,
                headers={"Accept": "application/json"},
            )
            if r.status_code == 200:
                return r.json()
            log.debug(f"{endpoint} returned {r.status_code}")
        except Exception as e:
            log.debug(f"{endpoint} failed: {e}")
    log.warning("All Overpass endpoints failed")
    return None


# ---------------------------------------------------------------------------
# Tag → field mapping
# ---------------------------------------------------------------------------

def extract_services(tags: dict) -> str:
    """Try to infer services from OSM tags."""
    services = []

    service_tags = {
        "hairdresser": "Fryzjer",
        "beauty":      "Kosmetyka",
        "barber":      "Barber",
        "nails":       "Paznokcie",
        "massage":     "Masaż",
        "facial":      "Zabiegi na twarz",
        "waxing":      "Depilacja",
        "solarium":    "Solarium",
    }
    # shop/amenity tag
    shop = tags.get("shop", tags.get("amenity", ""))
    if shop in service_tags:
        services.append(service_tags[shop])

    # Some OSM mappers add explicit service tags
    for key, label in service_tags.items():
        if tags.get(key) in ("yes", "only") and label not in services:
            services.append(label)

    # name language hints
    name = tags.get("name", "").lower()
    if any(w in name for w in ["wiet", "nail", "asian"]):
        if "Paznokcie" not in services:
            services.append("Paznokcie")
    if any(w in name for w in ["barber", "strzyżenie"]):
        if "Barber" not in services:
            services.append("Barber")

    return ", ".join(services)


def build_address(tags: dict) -> str:
    parts = [
        tags.get("addr:street", ""),
        tags.get("addr:housenumber", ""),
        tags.get("addr:postcode", ""),
        tags.get("addr:city", "Warszawa"),
    ]
    # Street + number first, then postcode + city
    street = " ".join(p for p in parts[:2] if p)
    rest   = " ".join(p for p in parts[2:] if p)
    return ", ".join(p for p in [street, rest] if p) or "Warszawa"


def infer_district(tags: dict, lat: float, lon: float) -> str:
    """
    First try explicit OSM district tag, then fall back to bounding-box lookup.
    """
    # Some OSM objects have district/suburb tags
    for key in ("addr:district", "addr:suburb", "is_in:district"):
        val = tags.get(key, "")
        if val:
            return val

    # Bounding box lookup
    for district, (south, west, north, east) in DISTRICT_BOUNDARIES.items():
        if south <= lat <= north and west <= lon <= east:
            return district
    return "Warszawa (dzielnica nieznana)"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def scrape_district(district_name: str, bbox: tuple) -> int:
    south, west, north, east = bbox
    query = build_query(south, west, north, east)
    data  = run_overpass_query(query)

    if not data:
        log.warning(f"No data for {district_name}")
        return 0

    elements = data.get("elements", [])
    log.info(f"{district_name}: {len(elements)} OSM elements found")
    saved = 0

    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name", "").strip()

        if not name:
            continue  # OSM often has unnamed nodes — skip

        # Coordinates: nodes have lat/lon directly; ways have a 'center'
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")

        address = build_address(tags)

        phone   = tags.get("phone") or tags.get("contact:phone")
        website = tags.get("website") or tags.get("contact:website")

        # Clean phone: OSM uses +48 XXX XXX XXX format
        if phone:
            phone = phone.strip()

        salon = {
            "name":        name,
            "address":     address,
            "district":    infer_district(tags, lat or 0, lon or 0),
            "phone":       phone,
            "website":     website,
            "services":    extract_services(tags),
            "source":      "osm",
            "source_id":   f"{el.get('type', 'n')}/{el.get('id', '')}",
            "source_url":  f"https://www.openstreetmap.org/{el.get('type', 'node')}/{el.get('id', '')}",
            "latitude":    lat,
            "longitude":   lon,
        }

        try:
            upsert_salon(salon)
            saved += 1
        except Exception as e:
            log.debug(f"Upsert failed for {name!r}: {e}")

    return saved


def run():
    init_db()
    total_saved = 0

    for district_name, bbox in DISTRICT_BOUNDARIES.items():
        n = scrape_district(district_name, bbox)
        total_saved += n
        log.info(f"✓ {district_name}: +{n}")
        time.sleep(3)  # Overpass rate limit — be polite

    stats = count_salons()
    log.info(f"=== Done. Total in DB: {stats['total']} | By source: {stats['by_source']} ===")


if __name__ == "__main__":
    run()
