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

Warsaw has changed a lot in the last few years. There's a huge Ukrainian community here now, and a well-established Vietnamese one too — and both of them are kind of underserved when it comes to finding beauty services. A lot of people from these communities are opening salons, doing nails or lashes from home, or looking for someone who speaks their language and knows their hair. None of that really shows up on Booksy or Google Maps.

The thing is, they're not looking on those platforms anyway. They're on Facebook.

### Facebook is where this all happens

I spent some time going through groups like *"Ukraińcy w Warszawie"* (300k+ members) and *"Wietnamczycy w Polsce"* and it was eye-opening. These groups are basically the town square — people ask for salon recommendations, someone replies with a phone number or a profile link, done. No Booksy listing, no Google review, just word of mouth inside the group.

So a big chunk of the salons that matter most to these communities are completely invisible to any scraper.

### The courses thing

While I was going through these groups I kept seeing something I didn't expect — posts advertising short beauty courses. Nail art, lash extensions, brow lamination, that kind of thing. Usually someone running a small studio or a recently-arrived instructor trying to build up students. Posts in Ukrainian or Vietnamese, priced pretty accessibly, and they'd get a bunch of replies within hours.

There's clearly a whole ecosystem of this that just doesn't exist anywhere structured. No platform covers it. That's what gave me the idea for the Courses section in the improvements list below.

### Why we can't just scrape Facebook

The short answer: it's against their ToS and it raises real GDPR issues. Facebook [explicitly prohibits](https://www.facebook.com/terms.php) automated data collection, and in the EU, scraping personal data from group posts — names, phone numbers, photos — is the kind of thing that gets companies in serious trouble. Meta has gone after scrapers legally and won.

So that data gap stays a gap. The workaround I'd go with is a community submission form — let instructors and salon owners post themselves.

### Mobile-first makes sense here

One more thing worth flagging: most of the people this app is actually for are on their phones. Not laptops. A PWA version with push notifications for new listings in your district would make this a lot more useful for the communities it's trying to serve. Next.js supports it via `next-pwa` so it's not even a big lift.

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
│   ├── run_all.py                 # Master runner (OSM → Booksy → Google → clean)
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

This writes `data/salons.db`. Expected output: **~3,235 salons** across Warsaw districts (97 duplicates removed via fuzzy dedup).

#### 2. Backend API (Kotlin / Ktor)

```bash
cd backend
.\gradlew.bat run  
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

**Why Booksy as primary?**
Booksy is the de-facto booking standard in Poland with very high adoption among professional salons. It provides structured service menus, real booking-based ratings (harder to fake), and consistent address formatting.

**Known data gap:**
A significant number of informal salons — especially those serving non-Polish immigrant communities — operate entirely through word-of-mouth, WhatsApp, or private Facebook groups. These are invisible to all platforms and are acknowledged in the quality report.

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

5. **Beauty course listings** — This one came directly from browsing the Facebook groups while researching the project. I kept seeing posts advertising short beauty courses — nail art, lash extensions, brow lamination — taught by instructors in the Ukrainian and Vietnamese communities, often out of a home studio, priced accessibly, and posted in Ukrainian or Vietnamese. It was striking how much of this activity exists and how completely invisible it is to any structured platform. None of it is on Booksy, Google, or OSM. A natural extension would be a dedicated **Courses** section alongside the salon listings, where people can discover upcoming workshops. The data model would add fields like `course_type`, `instructor`, `date`, `price`, and `language_of_instruction`. Since we can't scrape Facebook for the legal reasons described above, the most practical path is a **community submission form** — a simple page where instructors post their own courses, which get reviewed and published. Keeps the data clean while surfacing content that no API will ever reach.

6. **Scalability to all of Poland** — See section below.

---

## 🇵🇱 Scaling to All of Poland

The current architecture handles Warsaw (~3,235 salons). To cover all of Poland (~150,000+ salons) I would:

1. **Parallelise the scraper** — replace sequential district loops with an async task queue (Celery or simple `asyncio` + `aiohttp`). Each city/district becomes a job.

2. **Replace SQLite with PostgreSQL** — SQLite's write concurrency doesn't scale to parallel scraping. Postgres with a proper connection pool handles this easily.

3. **Structured city list** — Poland has 2,478 gminas (municipalities). A seed list from GUS (Central Statistical Office) gives complete coverage including rural areas that Google/Booksy thin out on.

4. **Rate limit management** — Each source has different limits. A token bucket per domain prevents bans while maximising throughput.

5. **Dedup at scale** — Fuzzy string matching is O(n²). At 15k+ records, switch to a blocking strategy: candidate pairs only within the same postal code prefix, then apply fuzzy match.

6. **Data freshness** — Add `last_scraped_at` and prioritise re-scraping records older than 30 days.

---

## 📊 Data Quality

After scraping and cleaning, the dataset has **3,235 salons** across Warsaw (97 duplicates removed).

### Missing Data

| Field | Missing | Coverage |
|-------|---------|----------|
| `price_range` | 3235 / 3235 | 0% ⚠️ |
| `services` | 2528 / 3235 | 22% |
| `phone` | 2004 / 3235 | 38% |
| `website` | 1019 / 3235 | 69% |
| `rating` | 754 / 3235 | 77% |
| `coordinates` | 0 / 3235 | 100% ✅ |

### Sources

| Source | Count |
|--------|-------|
| Booksy | 1,312 |
| Google | 1,274 |
| OSM | 649 |

### Top 10 Districts

| District | Salons |
|----------|--------|
| Mokotów | 471 |
| Wola | 352 |
| Praga-Południe | 306 |
| Białołęka | 199 |
| Targówek | 186 |
| Śródmieście | 182 |
| Ursus | 180 |
| Bielany | 170 |
| Bemowo | 154 |
| Wilanów | 154 |

> **Known gap:** `price_range` is unavailable from Booksy's `/core/v2/customer_api/businesses/` endpoint — individual business detail requests would be needed.  
> Run `python scraper/clean.py` to regenerate this report.

---

## 👤 Author

**Quoc Dat**
SumUp Warsaw Accelerator 2026 — Software Engineer Intern candidate
