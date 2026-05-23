"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import { Scissors, ChevronLeft, ChevronRight } from "lucide-react"
import { buildSalonListUrl, swrFetcher } from "@/lib/api"
import type { PagedResponse, SalonSummary } from "@/types/salon"
import { SalonCard } from "@/components/salon/SalonCard"
import { Filters, type ViewMode } from "@/components/salon/Filters"
import { MapView } from "@/components/salon/MapView"

const PAGE_SIZE    = 20
const MAP_MAX_SIZE = 1000   // fetch up to 1 000 pins in one go

export default function HomePage() {
  const [district, setDistrict] = useState("")
  const [service,  setService]  = useState("")
  const [search,   setSearch]   = useState("")
  const [source,   setSource]   = useState("")
  const [sort,     setSort]     = useState("reviews")   // backend default
  const [page,     setPage]     = useState(1)
  const [view,     setView]     = useState<ViewMode>("list")

  // Once the user opens the map tab, we keep it mounted to avoid Leaflet's
  // "container already initialized" error on remount. We just show/hide it.
  const [hasViewedMap, setHasViewedMap] = useState(false)

  // Reset to page 1 when any filter/sort changes
  useEffect(() => { setPage(1) }, [district, service, search, source, sort])

  // ── List fetch (paginated) ────────────────────────────────────────────────
  const listUrl = buildSalonListUrl({ district, service, search, source, sortBy: sort, page, pageSize: PAGE_SIZE })
  const { data: listData, isLoading: listLoading } = useSWR<PagedResponse<SalonSummary>>(
    listUrl,
    swrFetcher,
    { keepPreviousData: true },
  )

  // ── Map fetch (all matching results, large page) ──────────────────────────
  // Only starts fetching after the map tab is first opened.
  // SWR caches by URL, so subsequent filter changes re-use the cache.
  const mapUrl = hasViewedMap
    ? buildSalonListUrl({ district, service, search, source, sortBy: sort, page: 1, pageSize: MAP_MAX_SIZE })
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

  const handleDistrict = useCallback((v: string) => setDistrict(v), [])
  const handleService  = useCallback((v: string) => setService(v),  [])
  const handleSearch   = useCallback((v: string) => setSearch(v),   [])
  const handleSource   = useCallback((v: string) => setSource(v),   [])
  const handleSort     = useCallback((v: string) => setSort(v),     [])

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
        onDistrictChange={handleDistrict}
        onServiceChange={handleService}
        onSearchChange={handleSearch}
        onSourceChange={handleSource}
        onSortChange={handleSort}
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
            {/* Loading skeleton */}
            {listLoading && !listData && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="bg-white border border-border rounded-xl p-5 animate-pulse">
                    <div className="h-4 bg-border rounded w-3/4 mb-2" />
                    <div className="h-3 bg-border rounded w-1/2 mb-4" />
                    <div className="h-3 bg-border rounded w-1/3" />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!listLoading && listData?.data.length === 0 && (
              <div className="text-center py-20">
                <Scissors size={32} className="text-border mx-auto mb-4" />
                <h3 className="font-display text-xl text-ink mb-2">No salons found</h3>
                <p className="text-sm text-muted">Try adjusting your filters</p>
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
