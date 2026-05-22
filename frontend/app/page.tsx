"use client"

import { useState, useCallback, useEffect } from "react"
import useSWR from "swr"
import { Scissors, ChevronLeft, ChevronRight } from "lucide-react"
import { buildSalonListUrl, swrFetcher } from "@/lib/api"
import type { PagedResponse, SalonSummary } from "@/types/salon"
import { SalonCard } from "@/components/salon/SalonCard"
import { Filters } from "@/components/salon/Filters"

const PAGE_SIZE = 20

export default function HomePage() {
  const [district, setDistrict] = useState("")
  const [service,  setService]  = useState("")
  const [page,     setPage]     = useState(1)

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1) }, [district, service])

  const url = buildSalonListUrl({ district, service, page, pageSize: PAGE_SIZE })
  const { data, isLoading } = useSWR<PagedResponse<SalonSummary>>(url, swrFetcher, {
    keepPreviousData: true,
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  const handleDistrict = useCallback((v: string) => setDistrict(v), [])
  const handleService  = useCallback((v: string) => setService(v),  [])

  return (
    <div className="min-h-screen">

      {/* Hero header */}
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
            {data?.total ?? "—"} salons across 18 districts — from Śródmieście to Białołęka,
            including community salons not listed anywhere else.
          </p>
        </div>
      </header>

      {/* Sticky filters */}
      <Filters
        district={district}
        service={service}
        onDistrictChange={handleDistrict}
        onServiceChange={handleService}
        total={data?.total ?? 0}
      />

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Loading skeleton */}
        {isLoading && !data && (
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
        {!isLoading && data?.data.length === 0 && (
          <div className="text-center py-20">
            <Scissors size={32} className="text-border mx-auto mb-4" />
            <h3 className="font-display text-xl text-ink mb-2">No salons found</h3>
            <p className="text-sm text-muted">Try adjusting your filters</p>
          </div>
        )}

        {/* Grid */}
        {data && data.data.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.data.map((salon, i) => (
                <SalonCard key={salon.id} salon={salon} index={i} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border
                             rounded-lg hover:border-rose hover:text-rose transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border
                             rounded-lg hover:border-rose hover:text-rose transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
