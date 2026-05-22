"use client"

import { Search, SlidersHorizontal, X } from "lucide-react"
import useSWR from "swr"
import { swrFetcher } from "@/lib/api"

interface FiltersProps {
  district: string
  service: string
  onDistrictChange: (v: string) => void
  onServiceChange:  (v: string) => void
  total: number
}

export function Filters({
  district,
  service,
  onDistrictChange,
  onServiceChange,
  total,
}: FiltersProps) {
  const { data: districts } = useSWR<string[]>("/api/salons/districts", swrFetcher)

  const hasFilters = district || service

  return (
    <div className="bg-white border-b border-border sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Service search */}
          <div className="relative flex-1 min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by service (e.g. barber, nails…)"
              value={service}
              onChange={(e) => onServiceChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-cream border border-border rounded-lg
                         focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose/20
                         placeholder:text-muted transition-colors"
            />
            {service && (
              <button
                onClick={() => onServiceChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* District dropdown */}
          <div className="relative shrink-0">
            <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <select
              value={district}
              onChange={(e) => onDistrictChange(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm bg-cream border border-border rounded-lg
                         appearance-none focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose/20
                         text-ink cursor-pointer transition-colors min-w-[180px]"
            >
              <option value="">All districts</option>
              {districts?.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { onDistrictChange(""); onServiceChange("") }}
              className="text-xs text-rose hover:text-ink underline underline-offset-2 transition-colors shrink-0"
            >
              Clear filters
            </button>
          )}

          {/* Result count */}
          <span className="text-xs text-muted shrink-0 hidden sm:block">
            {total} salon{total !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  )
}
