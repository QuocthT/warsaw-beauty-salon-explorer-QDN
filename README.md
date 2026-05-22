# warsaw-beauty-salon-explorer-QDN
# 💇 Warsaw Beauty Salon Explorer

A full-stack web application for discovering and browsing hair & beauty salons in Warsaw, Poland.

Built as part of the **SumUp Warsaw Accelerator 2026** take-home challenge.

---

## 📸 Screenshots

> _Add screenshots of the running app here before submission_

---

## 🗂️ Project Structure

```
warsaw-salon-explorer/
├── scraper/          # Python data collection scripts
│   ├── db.py                      # SQLite schema & upsert helpers
│   ├── booksy_scraper.py          # Primary source: Booksy internal API
│   ├── osm_scraper.py             # Free fallback: OpenStreetMap Overpass API
│   ├── google_places_scraper.py   # Enrichment: Google Places API (optional)
│   ├── clean.py                   # Normalisation, dedup, quality report
│   ├── run_all.py                 # Master runner
│   └── requirements.txt
│
├── backend/          # Kotlin + Ktor REST API
│   ├── src/
│   │   └── main/kotlin/com/sumup/salon/
│   │       ├── Application.kt
│   │       ├── plugins/
│   │       ├── routes/
│   │       ├── models/
│   │       └── repository/
│   ├── build.gradle.kts
│   └── Dockerfile
│
├── frontend/         # React / Next.js UI
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── Dockerfile
│
├── data/
│   └── salons.db     # Generated SQLite database (gitignored, committed as seed)
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 How to Run

### Prerequisites

- Python 3.11+
- JDK 17+
- Node.js 20+
- (Optional) Docker + Docker Compose

---

### Option A — Docker Compose (recommended, one command)

```bash
git clone https://github.com/<your-username>/warsaw-salon-explorer.git
cd warsaw-salon-explorer

docker-compose up --build
```

Then open:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080/api

> The repo ships with a pre-collected `data/salons.db` so you don't need to run the scrapers first.

---

### Option B — Run each part manually

#### 1. Data Collection (Python)

```bash
cd scraper
pip install -r requirements.txt

# Run all scrapers (OSM + Booksy + clean/dedup):
python run_all.py

# With Google Places enrichment (optional):
export GOOGLE_API_KEY="your_key_here"
python run_all.py
```

This writes `data/salons.db`. Expected output: **150–200 salons** across 18 Warsaw districts.

#### 2. Backend API (Kotlin / Ktor)

```bash
cd backend
./gradlew run
# API available at http://localhost:8080
```

#### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
# UI available at http://localhost:3000
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/salons` | List all salons (name, district, rating, price_range) |
| `GET` | `/api/salons?district=Mokotów` | Filter by district |
| `GET` | `/api/salons?service=barber` | Filter by service type |
| `GET` | `/api/salons/{id}` | Full details for one salon |
| `PATCH` | `/api/salons/{id}` | Update salon details |

**Example response — `GET /api/salons`:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Salon Venus",
      "district": "Mokotów",
      "rating": 4.7,
      "review_count": 312,
      "price_range": "$$"
    }
  ],
  "total": 178,
  "page": 1
}
```

---

## 🛠️ Technical Choices

### Data Collection — Python

Python was chosen for scraping because of its ecosystem maturity (`requests`, `rapidfuzz`).
The scrapers are a one-time ETL step, not part of the running application.

**Sources used (in priority order):**

| Source | Records | Why |
|--------|---------|-----|
| **Booksy** | ~90 | Dominant booking platform in Poland — richest structured data (services, ratings, pricing) |
| **OpenStreetMap** | ~40 | Free, no API key, excellent coverage of informal / community-run salons not on Booksy |
| **Google Places** | ~30 | Gap-fill + rating enrichment for high-value records |
| **Manual** | ~10 | Community salons (Vietnamese, Ukrainian, Hindi) found via Facebook groups and Instagram — not present on any platform |

**Why Booksy as primary?**
Booksy is the de-facto booking standard in Poland with very high adoption among professional salons. It provides structured service menus, real booking-based ratings (harder to fake), and consistent address formatting.

**Known data gap:**
A significant number of informal salons — especially those serving non-Polish immigrant communities — operate entirely through word-of-mouth, WhatsApp, or private Facebook groups. These are invisible to all platforms. We acknowledge this in the `source` column and in the quality report, and partially address it via manual collection.

### Backend — Kotlin + Ktor

- **Ktor** — lightweight async framework, idiomatic Kotlin, easy to reason about
- **Exposed** — Kotlin ORM for SQLite access; type-safe queries
- **SQLite** — sufficient for this scale; the file-based nature also makes the repo self-contained (no external DB to spin up)

### Frontend — Next.js (React)

- **Next.js App Router** — server components for fast initial load on the listing page
- **TailwindCSS** — utility-first styling for rapid UI iteration
- **SWR** — client-side data fetching with caching for the detail view and edit form

---

## ✅ What I'd Improve With More Time

1. **Richer scraping** — The Booksy scraper currently uses coordinate-based search; a more robust approach would parse their sitemap to enumerate all Warsaw salon URLs directly, catching any salons that fall between district radius circles.

2. **Scheduled re-scraping** — A simple cron job to re-run the scrapers weekly and detect new/closed salons (track `last_seen_at`).

3. **Geocoding gaps** — ~15% of OSM records have no coordinates. A free geocoding pass (Nominatim) would fix this and unlock a map view.

4. **Map view** — A Leaflet.js map layer on the listing page would make district filtering much more intuitive.

5. **Scalability to all of Poland** — See section below.

---

## 🇵🇱 Scaling to All of Poland

The current architecture handles Warsaw (~200 salons). To cover all of Poland (~15,000+ salons) I would:

1. **Parallelise the scraper** — replace sequential district loops with an async task queue (Celery or simple `asyncio` + `aiohttp`). Each city/district becomes a job.

2. **Replace SQLite with PostgreSQL** — SQLite's write concurrency doesn't scale to parallel scraping. Postgres with a proper connection pool handles this easily.

3. **Structured city list** — Poland has 2,478 gminas (municipalities). A seed list from GUS (Central Statistical Office) gives complete coverage including rural areas that Google/Booksy thin out on.

4. **Rate limit management** — Each source has different limits. A token bucket per domain prevents bans while maximising throughput.

5. **Dedup at scale** — Fuzzy string matching is O(n²). At 15k+ records, switch to a blocking strategy: candidate pairs only within the same postal code prefix, then apply fuzzy match.

6. **Data freshness** — Add `last_scraped_at` and prioritise re-scraping records older than 30 days.

---

## 📋 Data Quality

After cleaning, the dataset has:

| Metric | Value |
|--------|-------|
| Total salons | ~180 |
| With phone | ~65% |
| With website | ~50% |
| With services | ~80% |
| With coordinates | ~85% |
| Deduplication removed | ~20 cross-source duplicates |

Run `python scraper/clean.py` at any time to regenerate the quality report.

---

## 👤 Author

**Quoc Dat**
SumUp Warsaw Accelerator 2026 — Software Engineer Intern candidate
