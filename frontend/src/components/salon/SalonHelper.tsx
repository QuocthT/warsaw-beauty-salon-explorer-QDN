"use client"

import { useState, useRef } from "react"
import type { FormEvent } from "react"
import { Bot } from "lucide-react"
import { SalonCard } from "./SalonCard"
import { buildSalonListUrl, swrFetcher } from "@/lib/api"
import type { ListParams } from "@/lib/api"
import type { PagedResponse, SalonSummary } from "@/types/salon"

// ── Intent parser ─────────────────────────────────────────────────────────────

const DISTRICTS = [
  "Śródmieście","Mokotów","Wola","Praga-Południe","Praga-Północ",
  "Ursynów","Bemowo","Białołęka","Bielany","Targówek","Żoliborz",
  "Ochota","Włochy","Ursus","Wilanów","Rembertów","Wawer","Wesoła",
]

// Strip Polish diacritics + hyphens/spaces for fuzzy matching
const deaccent = (s: string) =>
  s.toLowerCase()
   .replace(/ą/g,"a").replace(/ć/g,"c").replace(/ę/g,"e").replace(/ł/g,"l")
   .replace(/ń/g,"n").replace(/ó/g,"o").replace(/ś/g,"s").replace(/ź/g,"z").replace(/ż/g,"z")
   .replace(/[-\s]/g,"")

const matchDistrict = (text: string) => {
  const n = deaccent(text)
  return DISTRICTS.find(d => n.includes(deaccent(d)))
}

const SERVICE_MAP: [RegExp, string][] = [
  [/barber/i,                  "Barber"],
  [/hair|hairdress|fryzjer/i,  "Fryzjer"],
  [/nail|nails|paznokcie/i,    "Paznokcie"],
  [/brow|lash|rzesy/i,         "Brwi & Rzęsy"],
  [/\bspa\b|massage|masaz/i,   "Spa & Masaż"],
  [/wax|depil/i,               "Depilacja"],
  [/tattoo|tatuaz/i,           "Tatuaż"],
  [/cosmet|facial|kosmetyk/i,  "Kosmetyka"],
  [/slim|sylwet/i,             "Sylwetka"],
  [/solarium|tanning/i,        "Solarium"],
]
const matchService = (text: string) => SERVICE_MAP.find(([re]) => re.test(text))?.[1]

const COMMUNITY_MAP: [RegExp, string][] = [
  [/vietnamese|viet/i, "vietnamese"],
  [/ukrainian/i,       "ukrainian"],
  [/afro|african/i,    "afro"],
  [/hindi|indian/i,    "hindi"],
]
const matchCommunity = (text: string) => COMMUNITY_MAP.find(([re]) => re.test(text))?.[1]

const matchSort = (text: string) =>
  /best|top|highest.?rated/i.test(text) ? "rating" : "reviews"

interface Intent { district?: string; service?: string; sort: string; search?: string }

const parseIntent = (text: string): Intent => ({
  district: matchDistrict(text),
  service:  matchService(text),
  sort:     matchSort(text),
  search:   matchCommunity(text),
})

const buildSummary = (intent: Intent, total: number): string => {
  const sortLabel    = intent.sort === "rating" ? "top-rated" : "popular"
  const community    = intent.search   ? `${intent.search} ` : ""
  const serviceLabel = intent.service  ? ` ${intent.service.toLowerCase()}` : ""
  const location     = intent.district ? ` in ${intent.district}` : " across Warsaw"
  return `Showing ${community}${sortLabel}${serviceLabel} salons${location} (${total} result${total !== 1 ? "s" : ""})`
}

const CHIPS = ["Best barbers in Mokotów","Nail salons in Śródmieście","Vietnamese salons","Popular hair salons in Wola"]

// ── Component ─────────────────────────────────────────────────────────────────

interface AgentState {
  status: "idle" | "loading" | "done" | "error"
  results: SalonSummary[]
  total: number
  intent: Intent | null
}
const INIT: AgentState = { status: "idle", results: [], total: 0, intent: null }

export function SalonHelper() {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState("")
  const [state, setState] = useState<AgentState>(INIT)
  const inputRef = useRef<HTMLInputElement>(null)

  async function runQuery(text: string) {
    const t = text.trim()
    if (!t) return
    const intent = parseIntent(t)
    const params: ListParams = {
      district: intent.district,
      service:  intent.service,
      search:   intent.search,
      sortBy:   intent.sort,
      pageSize: 8,
      page:     1,
    }
    setState({ status: "loading", results: [], total: 0, intent })
    try {
      const data: PagedResponse<SalonSummary> = await swrFetcher(buildSalonListUrl(params))
      setState({ status: "done", results: data.data.slice(0, 8), total: data.total, intent })
    } catch {
      setState(s => ({ ...s, status: "error" }))
    }
  }

  const handleChip   = (chip: string) => { setQuery(chip); runQuery(chip) }
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); runQuery(query) }
  const handleOpen   = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }
  const handleClose  = () => { setOpen(false); setState(INIT); setQuery("") }

  return (
    <div className="relative">

      {/* ── Trigger — pulled into header bottom-right via negative margin ── */}
      {!open && (
        <div className="-mt-10 max-w-6xl mx-auto px-4 flex justify-end relative z-10 pb-2">
          <button
            onClick={handleOpen}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full border
                       transition-all duration-200 bg-rose/15 text-rose border-rose/40
                       hover:bg-rose hover:text-cream hover:shadow-lg hover:scale-105"
          >
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose text-cream shrink-0">
              <Bot size={12} strokeWidth={2.5} />
            </span>
            Ask a question
            <span className="text-rose/60 group-hover:text-cream/60">✦</span>
          </button>
        </div>
      )}

      {/* ── Expanded panel ────────────────────────────────────────────────── */}
      {open && (
        <div className="bg-cream border-b border-border animate-fade-in">
          <div className="max-w-6xl mx-auto px-4 pt-5 pb-7">

            {/* Input row */}
            <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="e.g. Best barbers in Mokotów…"
                className="flex-1 px-4 py-2 text-sm bg-white border border-border rounded-lg
                           focus:outline-none focus:border-rose text-ink placeholder:text-muted"
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-rose text-white rounded-lg hover:bg-rose/90 transition-colors"
              >
                Search
              </button>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="px-3 py-2 text-sm text-muted hover:text-ink transition-colors"
              >
                ✕
              </button>
            </form>

            {/* Example chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  className="px-3 py-1 text-xs rounded-full border border-border bg-white
                             text-muted hover:border-rose hover:text-rose transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Loading */}
            {state.status === "loading" && (
              <p className="text-sm text-muted py-3 animate-fade-in">Searching…</p>
            )}

            {/* Results */}
            {state.status === "done" && state.intent && (
              <div className="animate-fade-in">
                <p className="text-sm font-medium text-ink mb-4">
                  {buildSummary(state.intent, state.total)}
                </p>

                {state.results.length === 0 ? (
                  <div className="py-6 text-center space-y-1.5">
                    <p className="text-sm text-muted">No salons found for that query.</p>
                    <p className="text-xs text-muted/70">
                      Try removing the district filter or broadening the service keyword.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {state.results.map((salon, i) => (
                      <SalonCard key={salon.id} salon={salon} index={i} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {state.status === "error" && (
              <p className="text-sm text-rose py-3">Something went wrong. Please try again.</p>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
