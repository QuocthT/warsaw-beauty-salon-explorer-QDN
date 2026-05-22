"""
debug_booksy.py — Single request test to see exactly what Booksy returns.
Run this before the full scraper to diagnose issues.
"""

import requests
import json

HEADERS = {
    "User-Agent":         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
    "Accept":             "application/json, text/plain, */*",
    "Accept-Language":    "en-PL, en",
    "Cache-Control":      "no-cache",
    "Pragma":             "no-cache",
    "Origin":             "https://booksy.com",
    "Referer":            "https://booksy.com/",
    "Sec-Fetch-Dest":     "empty",
    "Sec-Fetch-Mode":     "cors",
    "Sec-Fetch-Site":     "same-site",
    "X-Api-Key":          "web-e3d812bf-d7a2-445d-ab38-55589ae6a121",
    "X-App-Version":      "3.0",
    "X-Fingerprint":      "cf58b9f9-c369-49ed-a2ed-6a859f36c97e",
}

params = {
    "no_thumbs":                  "true",
    "with_markdown":              "1",
    "query":                      "salon",
    "include_ext_listing":        "0",
    "include_venues":             "1",
    "include_seo_metadata":       "1",
    "include_b_listing":          "1",
    "include_details":            "1",
    "include_treatment_services": "1",
    "response_type":              "listing_web",
    "location_id":                3,
    "area":                       "52.250,21.045,52.215,20.985",  # Śródmieście
    "offset":                     0,
    "size":                       10,
}

print("=== Sending request to Booksy ===")
print(f"URL: https://pl.booksy.com/core/v2/customer_api/businesses/")
print(f"Params: {json.dumps(params, indent=2)}")
print()

r = requests.get(
    "https://pl.booksy.com/core/v2/customer_api/businesses/",
    headers=HEADERS,
    params=params,
    timeout=15,
)

print(f"Status: {r.status_code}")
print(f"Content-Type: {r.headers.get('content-type', 'unknown')}")
print()

if r.status_code != 200:
    print(f"ERROR BODY:\n{r.text[:500]}")
else:
    data = r.json()
    print(f"Top-level keys: {list(data.keys())}")
    print()

    businesses = data.get("businesses", [])
    print(f"Businesses count: {len(businesses)}")
    print(f"Total reported:   {data.get('total', 'N/A')}")
    print()

    if businesses:
        print("=== First business (raw) ===")
        print(json.dumps(businesses[0], indent=2, ensure_ascii=False)[:2000])
    else:
        print("=== Full response (no businesses found) ===")
        print(json.dumps(data, indent=2, ensure_ascii=False)[:2000])
