"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { Scissors, ChevronLeft, ChevronRight, X, SearchX } from "lucide-react"
import { buildSalonListUrl, swrFetcher } from "@/lib/api"
import type { PagedResponse, SalonSummary } from "@/types/salon"
import { SalonCard } from "@/components/salon/SalonCard"
import { SalonCardSkeleton } from "@/components/salon/SalonCardSkeleton"
import { Filters, type ViewMode } from "@/components/salon/Filters"
import { MapView } from "@/components/salon/MapView"

const PAGE_SIZE    = 20
const MAP_MAX_SIZE = 5000   // fetch up to 5 000 pins in one go

export default function HomePage() {
  const [district,  setDistrict]  = useState("")
  const [service,   setService]   = useState("")
  const [search,    setSearch]    = useState("")
  const [source,    setSource]    = useState("")
  const [sort,      setSort]      = useState("reviews")   // backend default
  const [minRating, setMinRating] = useState(0)           // 0 = no rating filter
  const [page,      setPage]      = useState(1)
  const [view,      setView]      = useState<ViewMode>("list")

  // Once the user opens the map tab, we keep it mounted to avoid Leaflet's
  // "container already initialized" error on remount. We just show/hide it.
  const [hasViewedMap, setHasViewedMap] = useState(false)

  // Reset to page 1 when any filter/sort changes
  useEffect(() => { setPage(1) }, [district, service, search, source, sort, minRating])

  // ── List fetch (paginated) ────────────────────────────────────────────────
  const listUrl = buildSalonListUrl({ district, service, search, source, sortBy: sort, minRating, page, pageSize: PAGE_SIZE })
  const { data: listData, isLoading: listLoading } = useSWR<PagedResponse<SalonSummary>>(
    listUrl,
    swrFetcher,
    { keepPreviousData: true },
  )

  // ── Map fetch (all matching results, large page) ──────────────────────────
  // Only starts fetching after the map tab is first opened.
  // SWR caches by URL, so subsequent filter changes re-use the cache.
  const mapUrl = hasViewedMap
    ? buildSalonListUrl({ district, service, search, source, sortBy: sort, minRating, page: 1, pageSize: MAP_MAX_SIZE })
    : null
  const { data: mapData, isLoading: mapLoading } = useSWR<PagedResponse<SalonSummary>>(
    mapUrl,
    swrFetcher,
    { keepPreviousData: true },
  )

  const totalPages = listData ? Math.ceil(listData.total / PAGE_SIZE) : 0
  const headerTotal = listData?.total ?? "—"

  // Scroll the list top into view when the page changes (skip the very first render).
  const listTopRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    listTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [page])

  const handleDistrict  = useCallback((v: string) => setDistrict(v),  [])
  const handleService   = useCallback((v: string) => setService(v),   [])
  const handleSearch    = useCallback((v: string) => setSearch(v),    [])
  const handleSource    = useCallback((v: string) => setSource(v),    [])
  const handleSort      = useCallback((v: string) => setSort(v),      [])
  const handleMinRating = useCallback((v: number) => setMinRating(v), [])

  const handleViewChange = useCallback((v: ViewMode) => {
    if (v === "map") setHasViewedMap(true)
    setView(v)
  }, [])

  return (
    <div className="min-h-screen">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <header className="bg-ink text-cream">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-rose flex items-center justify-center">
              <Scissors size={16} className="text-white" />
            </div>
            <span className="text-xs tracking-[0.2em] uppercase text-muted font-medium">
              Warsaw Beauty Explorer
            </span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
            Find your salon<br />
            <span className="text-rose">in Warsaw.</span>
          </h1>
          <p className="mt-3 text-sm text-muted max-w-md">
            {headerTotal} salons across 18 districts — from Śródmieście to Białołęka,
            including community salons not listed anywhere else.
          </p>
        </div>
      </header>

      {/* ── Sticky filters ──────────────────────────────────────────────── */}
      <Filters
        district={district}
        service={service}
        search={search}
        source={source}
        sortBy={sort}
        minRating={minRating}
        onDistrictChange={handleDistrict}
        onServiceChange={handleService}
        onSearchChange={handleSearch}
        onSourceChange={handleSource}
        onSortChange={handleSort}
        onMinRatingChange={handleMinRating}
        total={view === "map" ? (mapData?.total ?? listData?.total ?? 0) : (listData?.total ?? 0)}
        view={view}
        onViewChange={handleViewChange}
      />

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* ── MAP VIEW ────────────────────────────────────────────────────────
            Rendered once hasViewedMap is true, then kept mounted permanently.
            CSS display:none hides it in list mode — no unmount = no Leaflet
            "container already initialized" error on re-open.
        ─────────────────────────────────────────────────────────────────── */}
        {hasViewedMap && (
          <div style={{ display: view === "map" ? "block" : "none" }}>
            <MapView
              salons={mapData?.data ?? []}
              isLoading={mapLoading && !mapData}
              visible={view === "map"}
            />
          </div>
        )}

        {/* ── LIST VIEW ───────────────────────────────────────────────────── */}
        {view === "list" && (
          <>
            {/* ── Skeleton: shown only on the very first fetch (no cached data yet) ── */}
            {listLoading && !listData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <SalonCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* ── Empty state: search/filter returned zero results ── */}
            {!listLoading && listData?.data.length === 0 && (
              <div className="flex flex-col items-center py-24 text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-cream border border-border flex items-center justify-center mb-5">
                  <SearchX size={26} className="text-muted" />
                </div>

                <h3 className="font-display text-xl font-semibold text-ink mb-2">
                  No salons found
                </h3>

                <p className="text-sm text-muted mb-6 max-w-xs">
                  {search
                    ? <>No results for <span className="font-medium text-ink">"{search}"</span>. Try a different name or service.</>
                    : "No salons match your current filters. Try widening your search."}
                </p>

                {/* Active filter pills — tap any to clear just that filter */}
                {(search || district || service || source || minRating > 0) && (
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    {search && (
                      <button
                        onClick={() => handleSearch("")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cream
                                   border border-border rounded-full hover:border-rose
                                   hover:text-rose transition-colors"
                      >
                        <X size={11} />
                        Search: &ldquo;{search}&rdquo;
                      </button>
                    )}
                    {district && (
                      <button
                        onClick={() => handleDistrict("")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cream
                                   border border-border rounded-full hover:border-rose
                                   hover:text-rose transition-colors"
                      >
                        <X size={11} />
                        {district}
                      </button>
                    )}
                    {service && (
                      <button
                        onClick={() => handleService("")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cream
                                   border border-border rounded-full hover:border-rose
                                   hover:text-rose transition-colors"
                      >
                        <X size={11} />
                        {service}
                      </button>
                    )}
                    {source && (
                      <button
                        onClick={() => handleSource("")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cream
                                   border border-border rounded-full hover:border-rose
                                   hover:text-rose transition-colors"
                      >
                        <X size={11} />
                        Source: {source}
                      </button>
                    )}
                    {minRating > 0 && (
                      <button
                        onClick={() => handleMinRating(0)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cream
                                   border border-border rounded-full hover:border-rose
                                   hover:text-rose transition-colors"
                      >
                        <X size={11} />
                        ≥ {minRating.toFixed(1)} ★
                      </button>
                    )}
                  </div>
                )}

                {/* Clear-all CTA */}
                <button
                  onClick={() => {
                    handleSearch("")
                    handleDistrict("")
                    handleService("")
                    handleSource("")
                    handleMinRating(0)
                  }}
                  className="px-5 py-2.5 text-sm bg-rose text-white rounded-lg
                             hover:bg-rose/90 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Grid */}
            {listData && listData.data.length > 0 && (
              <>
                {/* Scroll anchor — sits just above the grid so the sticky bar doesn't obscure it */}
                <div ref={listTopRef} className="-mt-4 pt-4" />

                <div className={[
                  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
                  "transition-opacity duration-150",
                  listLoading ? "opacity-50 pointer-events-none" : "opacity-100",
                ].join(" ")}>
                  {listData.data.map((salon, i) => (
                    <SalonCard key={salon.id} salon={salon} index={i} />
                  ))}
                </div>

                {/* Pagination — always show page indicator; buttons only when multi-page */}
                <div className="flex items-center justify-center gap-4 mt-10">
                  {totalPages > 1 && (
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border
                                 rounded-lg hover:border-rose hover:text-rose transition-colors
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>
                  )}

                  <span className="text-sm text-muted">
                    Page <span className="font-semibold text-ink">{page}</span> of {totalPages}
                  </span>

                  {totalPages > 1 && (
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border
                                 rounded-lg hover:border-rose hover:text-rose transition-colors
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

      </main>
    </div>
  )
}
