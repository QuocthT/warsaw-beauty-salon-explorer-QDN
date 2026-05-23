# 💇 Warsaw Beauty Salon Explorer

A full-stack web application for discovering and browsing hair & beauty salons in Warsaw, Poland.

Built as part of the **SumUp Warsaw Accelerator 2026** take-home challenge.

---

## 🎥 Video Demo

Click the image below to watch a 4-minute walkthrough of the Warsaw Beauty Salon Explorer, including the map view, data sources, and the text-filtering helper:

[![Watch the video](https://cdn.loom.com/sessions/thumbnails/d853a5dc73c84e77b7fe0e0b27285a2f-with-play.jpg)](https://www.loom.com/share/d853a5dc73c84e77b7fe0e0b27285a2f)

---

## 💭 Thoughts by Dave before technicalities

### Who actually needs this?

Warsaw has seen a sharp influx of newcomers over the last few years — most notably **Ukrainian** and **Vietnamese** communities, both of which are among the largest immigrant groups in Poland today. Many of these people are:

- Opening new salons (often informal, home-based, or community-run)
- Searching for salons that speak their language and understand their hair/beauty needs
- Completely **invisible on mainstream Polish platforms** like Booksy, Google Maps, or Yelp

These communities don't discover services the way Polish locals do. They rely on **Facebook — heavily.**

### Facebook is where these communities live

Ukrainian and Vietnamese diaspora groups on Facebook in Warsaw are enormous and highly active:

- **"Ukraińcy w Warszawie"** — one of the largest immigrant Facebook groups in Poland, with **300,000+ members**, used daily for business recommendations, housing, jobs, and beauty services
- **"Wietnamczycy w Polsce / Vietnamese in Poland"** — thousands of members sharing recommendations in Vietnamese
- Meta's own 2023 data shows Facebook penetration in Ukraine sits at **~65% of the population** — among the highest in Eastern Europe — and this behavior carries over strongly into the diaspora
- Vietnamese Facebook usage is similarly dominant: Vietnam has **~70 million Facebook users** (2024), making it one of the top-10 countries by usage globally — a habit that migrates with the community

> In short: if a Ukrainian or Vietnamese person in Warsaw is looking for a nail salon that speaks their language, **they ask in a Facebook group**, not on Google.

### Why we can't just scrape Facebook

The obvious next question is: *why not pull data from these Facebook groups?*

The answer is **legal**, not technical.

Facebook's Terms of Service ([Section 3.2](https://www.facebook.com/terms.php)) explicitly prohibit:

> *"collect users' content or information, or otherwise access Facebook, using automated means (such as harvesting bots, robots, spiders, or scrapers) without our prior permission."*

Beyond the ToS, scraping Facebook in the EU also raises serious **GDPR concerns** — group posts contain personal data (names, phone numbers, photos) of real people who consented to share within a community, not to be indexed by a third party. Meta has actively litigated against scrapers and won.

So Facebook groups remain a known data gap we acknowledge but cannot close programmatically. The partial workaround used here is **manual collection** — physically reading group posts and adding entries by hand — which is time-consuming but legally sound.

### Future direction: Mobile-first

A natural next step for this project is a **mobile app or progressive web app (PWA)**. The reason is simple:

- The communities described above are predominantly **mobile-only internet users** — smartphones are the primary (sometimes only) device
- Salon discovery is a task people do on the go, not at a desk
- A PWA would also allow push notifications for new salon listings in a user's district — something the current web app can't do

This would not require a full React Native rewrite; Next.js already supports PWA configuration via `next-pwa`, making it a relatively low-effort upgrade with high community impact.

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
│   └── salons.db     # Pre-collected SQLite database — committed to repo, no scraping needed
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
git clone https://github.com/QuocthT/warsaw-beauty-salon-explorer-QDN.git
cd warsaw-beauty-salon-explorer-QDN

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

This writes `data/salons.db`. Expected output: **~3,950 salons** across 18 Warsaw districts (523 duplicates removed via fuzzy dedup).

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
| **Booksy** | 1,305 | Dominant booking platform in Poland — richest structured data (services, ratings, pricing) |
| **OpenStreetMap** | 1,368 | Free, no API key, excellent coverage of informal / community-run salons not on Booksy |
| **Google Places** | 1,264 | Gap-fill + rating enrichment for high-value records |
| **Manual** | 13 | Community salons (Vietnamese, Ukrainian, Afro, Hindi) found via Facebook groups and Instagram — not present on any platform |

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

3. **Rating reliability** — Ratings currently skew high: Google returns the highest-rated results first, and a low review count pushes scores toward a perfect 5.0. The fix is a Bayesian/weighted score (blending each salon's rating toward the global mean, weighted by review count). As a short-term mitigation, "Highest rated" sort already requires ≥ 5 reviews, and low-confidence ratings are visually dimmed in the UI.

4. **Price range** — Not returned by Booksy's `/core/v2/customer_api/businesses/` endpoint; individual business detail requests would be needed to surface it.

5. **Scalability to all of Poland** — See section below.

---

## 🇵🇱 Scaling to All of Poland

The current architecture handles Warsaw (~3,950 salons). To cover all of Poland (~150,000+ salons) I would:

1. **Parallelise the scraper** — replace sequential district loops with an async task queue (Celery or simple `asyncio` + `aiohttp`). Each city/district becomes a job.

2. **Replace SQLite with PostgreSQL** — SQLite's write concurrency doesn't scale to parallel scraping. Postgres with a proper connection pool handles this easily.

3. **Structured city list** — Poland has 2,478 gminas (municipalities). A seed list from GUS (Central Statistical Office) gives complete coverage including rural areas that Google/Booksy thin out on.

4. **Rate limit management** — Each source has different limits. A token bucket per domain prevents bans while maximising throughput.

5. **Dedup at scale** — Fuzzy string matching is O(n²). At 15k+ records, switch to a blocking strategy: candidate pairs only within the same postal code prefix, then apply fuzzy match.

6. **Data freshness** — Add `last_scraped_at` and prioritise re-scraping records older than 30 days.

---

## 📊 Data Quality

After scraping and cleaning, the dataset has **3,950 salons** across Warsaw.

### Missing Data

| Field | Missing | Coverage |
|-------|---------|----------|
| `price_range` | 3937 / 3950 | 0% ⚠️ |
| `phone` | 2557 / 3950 | 35% |
| `services` | 2450 / 3950 | 38% |
| `website` | 1667 / 3950 | 58% |
| `rating` | 1483 / 3950 | 62% |
| `coordinates` | 0 / 3950 | 100% ✅ |

### Sources

| Source | Count |
|--------|-------|
| OSM | 1,368 |
| Booksy | 1,305 |
| Google | 1,264 |
| Manual | 13 |

### Top 10 Districts

| District | Salons |
|----------|--------|
| Śródmieście | 547 |
| Mokotów | 461 |
| Ursynów | 356 |
| Praga-Południe | 313 |
| Białołęka | 238 |
| Wola | 211 |
| Bemowo | 209 |
| Targówek | 205 |
| Ursus | 201 |
| Bielany | 172 |

> **Known gap:** `price_range` is unavailable from Booksy's `/core/v2/customer_api/businesses/` endpoint — individual business detail requests would be needed.  
> Run `python scraper/clean.py` to regenerate this report.

---

## 👤 Author

**Quoc Dat**
SumUp Warsaw Accelerator 2026 — Software Engineer Intern candidate
