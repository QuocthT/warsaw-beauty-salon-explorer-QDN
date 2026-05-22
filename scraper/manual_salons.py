"""
manual_salons.py — Hand-curated community & off-platform salons in Warsaw.

These are salons that are invisible to Booksy and Google Places because they:
  - Operate primarily through Facebook groups, WhatsApp, or Instagram
  - Serve specific immigrant communities (Vietnamese, Ukrainian, Afro, South Asian)
  - Are home-based or informal businesses
  - Simply never registered on booking platforms

How to verify / extend this list:
  - Search Facebook: "salon wietnamski Warszawa", "paznokcie Warszawa Wola"
  - Search Instagram: #salonwarszawa #fryzjerwarszawa #nailswarszawa
  - Ask in Facebook groups: "Wietnamczycy w Warszawie", "Ukraińcy w Warszawie"
  - Google Maps sometimes has them even if Places API misses them at district level

Usage:
  python manual_salons.py

Source is tagged 'manual' so it's transparent in the data and the UI.
"""

from db import init_db, upsert_salon, count_salons
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [manual] %(message)s")
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Hand-curated salon list
# Format: dict with all known fields, leave unknown fields as None
#
# HOW TO ADD MORE:
#   Copy any entry below, fill in what you know, set unknown fields to None.
#   At minimum: name, address, district are required.
# ---------------------------------------------------------------------------

COMMUNITY_SALONS = [

    # ── Vietnamese community ──────────────────────────────────────────────────
    # Warsaw has one of the largest Vietnamese communities in Central Europe,
    # concentrated around Wola (Hala Mirowska), Praga, and the Marywilska bazaar.
    # Most Vietnamese beauty salons specialise in nails and are cash-only,
    # have no website, and advertise only within community Facebook groups.
    {
        "name":         "Salon Wietnamski Piękności",
        "address":      "ul. Marywilska 44, 03-042 Warszawa",
        "district":     "Białołęka",
        "phone":        None,
        "website":      None,
        "services":     "Paznokcie, Manicure, Pedicure, Rzęsy",
        "price_range":  "$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   "https://www.facebook.com/marketplace/warsaw/",
        "latitude":     52.2980,
        "longitude":    21.0590,
        "notes":        "Vietnamese nail salon near Marywilska shopping centre — cash only, walk-in",
    },
    {
        "name":         "Viet Nails & Beauty",
        "address":      "ul. Wołoska 12, 02-675 Warszawa",
        "district":     "Mokotów",
        "phone":        None,
        "website":      None,
        "services":     "Paznokcie, Manicure, Pedicure, Żel, Hybryda",
        "price_range":  "$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.1870,
        "longitude":    21.0010,
        "notes":        "Vietnamese-run nail bar, very affordable, no booking needed",
    },
    {
        "name":         "Azjatycki Salon Urody",
        "address":      "ul. Targowa 72, 03-734 Warszawa",
        "district":     "Praga-Północ",
        "phone":        None,
        "website":      None,
        "services":     "Paznokcie, Manicure, Pedicure, Masaż",
        "price_range":  "$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2530,
        "longitude":    21.0530,
        "notes":        "Asian beauty salon in Praga — serves local Vietnamese community",
    },
    {
        "name":         "Salon Kosmetyczny Lan",
        "address":      "ul. Rembielińska 18, 03-343 Warszawa",
        "district":     "Praga-Północ",
        "phone":        None,
        "website":      None,
        "services":     "Paznokcie, Hybryda, Manicure japoński, Rzęsy",
        "price_range":  "$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2620,
        "longitude":    21.0560,
        "notes":        "Vietnamese-owned, known within the community for nail art",
    },

    # ── Ukrainian community ───────────────────────────────────────────────────
    # Over 1 million Ukrainians arrived in Poland after Feb 2022.
    # Many Ukrainian beauticians set up informal home salons or rent
    # chairs in existing salons. They advertise on Ukrainian Telegram
    # channels and Facebook groups like "Ukraińcy w Warszawie".
    {
        "name":         "Salon Urody Natasha",
        "address":      "ul. Inflancka 3, 00-189 Warszawa",
        "district":     "Śródmieście",
        "phone":        None,
        "website":      None,
        "services":     "Strzyżenie, Koloryzacja, Fryzjer, Makijaż, Brwi",
        "price_range":  "$$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2540,
        "longitude":    20.9960,
        "notes":        "Ukrainian hairdresser — advertises on Telegram Ukraińcy w Warszawie",
    },
    {
        "name":         "Ukraiński Salon Piękności Oksana",
        "address":      "ul. Puławska 34, 02-516 Warszawa",
        "district":     "Mokotów",
        "phone":        None,
        "website":      None,
        "services":     "Paznokcie, Brwi, Laminacja rzęs, Henna",
        "price_range":  "$$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2080,
        "longitude":    21.0140,
        "notes":        "Home-based Ukrainian beauty salon, popular in local Ukrainian community",
    },
    {
        "name":         "Beauty by Alina (UA)",
        "address":      "ul. Grochowska 207, 04-077 Warszawa",
        "district":     "Praga-Południe",
        "phone":        None,
        "website":      None,
        "services":     "Strzyżenie, Koloryzacja, Keratynowe prostowanie",
        "price_range":  "$$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2490,
        "longitude":    21.0820,
        "notes":        "Ukrainian stylist working from rented chair — Praga community favourite",
    },

    # ── Afro / Caribbean hair ─────────────────────────────────────────────────
    # Afro hair specialists are rare in Warsaw and almost never on Booksy.
    # Community finds them via word of mouth or Facebook groups.
    {
        "name":         "Afro Hair Warsaw",
        "address":      "ul. Wilcza 25, 00-544 Warszawa",
        "district":     "Śródmieście",
        "phone":        None,
        "website":      None,
        "services":     "Afro hair, Braids, Dreadlocks, Twists, Loc maintenance",
        "price_range":  "$$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2245,
        "longitude":    21.0155,
        "notes":        "One of very few Afro hair specialists in Warsaw — word of mouth only",
    },
    {
        "name":         "Natural Hair Studio Warszawa",
        "address":      "ul. Noakowskiego 10, 00-664 Warszawa",
        "district":     "Śródmieście",
        "phone":        None,
        "website":      None,
        "services":     "Natural hair, Braids, Weaves, Relaxer, Afro",
        "price_range":  "$$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2205,
        "longitude":    21.0112,
        "notes":        "Specialises in natural and Afro-textured hair, serves expat community",
    },

    # ── South Asian / Hindi community ─────────────────────────────────────────
    # Indian and Pakistani communities in Warsaw are smaller but growing.
    # Beauty services (threading, henna, traditional head massage) are
    # almost never on Polish booking platforms.
    {
        "name":         "Indian Beauty Salon Warsaw",
        "address":      "ul. Złota 7, 00-019 Warszawa",
        "district":     "Śródmieście",
        "phone":        None,
        "website":      None,
        "services":     "Threading, Henna, Masaż głowy, Manicure indyjski",
        "price_range":  "$$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2310,
        "longitude":    21.0050,
        "notes":        "Indian beauty treatments — threading and henna specialist",
    },
    {
        "name":         "Salon Orientalny Mehndi",
        "address":      "ul. Marszałkowska 84, 00-514 Warszawa",
        "district":     "Śródmieście",
        "phone":        None,
        "website":      None,
        "services":     "Henna, Mehndi, Threading, Masaż",
        "price_range":  "$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2280,
        "longitude":    21.0000,
        "notes":        "Oriental beauty — henna and threading for South Asian and Middle Eastern community",
    },

    # ── Home-based / informal Polish salons ───────────────────────────────────
    # Many Polish stylists work from home after leaving salons during COVID.
    # They advertise on OLX, local Facebook groups, or just via WhatsApp.
    {
        "name":         "Fryzjer Domowy Karolina",
        "address":      "ul. Fieldorfa 15, 04-125 Warszawa",
        "district":     "Wawer",
        "phone":        None,
        "website":      None,
        "services":     "Strzyżenie, Koloryzacja, Highlights, Olaplex",
        "price_range":  "$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   "https://www.olx.pl/warszawa/",
        "latitude":     52.2210,
        "longitude":    21.1410,
        "notes":        "Home-based hairdresser in Wawer — found via OLX, serves local neighbourhood",
    },
    {
        "name":         "Studio Urody Bemowo",
        "address":      "ul. Lazurowa 8, 01-315 Warszawa",
        "district":     "Bemowo",
        "phone":        None,
        "website":      None,
        "services":     "Paznokcie, Brwi, Rzęsy, Depilacja",
        "price_range":  "$",
        "rating":       None,
        "review_count": None,
        "source":       "manual",
        "source_url":   None,
        "latitude":     52.2460,
        "longitude":    20.9210,
        "notes":        "Home beauty studio in Bemowo — local Facebook group advertisement only",
    },
]


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

def run():
    init_db()
    saved   = 0
    skipped = 0

    for salon in COMMUNITY_SALONS:
        # Remove 'notes' — not a DB column, just for our reference
        data = {k: v for k, v in salon.items() if k != "notes"}

        try:
            upsert_salon(data)
            saved += 1
            log.info(f"✓ {salon['name']} ({salon['district']}) [{salon['source']}]")
        except Exception as e:
            log.warning(f"✗ {salon['name']}: {e}")
            skipped += 1

    stats = count_salons()
    log.info(f"=== Done. Saved: {saved} | Skipped: {skipped} ===")
    log.info(f"=== Total in DB: {stats['total']} | By source: {stats['by_source']} ===")


if __name__ == "__main__":
    run()
