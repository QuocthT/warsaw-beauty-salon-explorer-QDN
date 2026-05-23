"use client"

import { Search, SlidersHorizontal, ArrowUpDown, Database, X, LayoutList, Map } from "lucide-react"
import useSWR from "swr"
import { swrFetcher } from "@/lib/api"

export type ViewMode = "list" | "map"

/**
 * Full static taxonomy — matches the NAME_RULES in SalonCard.
 * `value` is the keyword sent to the backend (searches both name + services).
 * `label` is what's displayed on the chip.
 */
const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "Most reviewed", value: "reviews" },
  { label: "Highest rated", value: "rating"  },
  { label: "A–Z",           value: "name"    },
]

const SOURCE_OPTIONS: { label: string; value: string }[] = [
  { label: "All sources",   value: ""        },
  { label: "Booksy",        value: "booksy"  },
  { label: "Google",        value: "google"  },
  { label: "OpenStreetMap", value: "osm"     },
  { label: "Community",     value: "manual"  },
]

const SERVICE_CHIPS: { label: string; value: string }[] = [
  { label: "Barber",        value: "barber"   },
  { label: "Fryzjer",       value: "fryzjer"  },
  { label: "Kosmetyka",     value: "kosmetyk" },
  { label: "Paznokcie",     value: "paznokc"  },
  { label: "Brwi & Rzęsy",  value: "brwi"     },
  { label: "Spa & Masaż",   value: "spa"      },
  { label: "Depilacja",     value: "depilac"  },
  { label: "Tatuaż",        value: "tatuaż"   },
  { label: "Sylwetka",      value: "sylwetk"  },
  { label: "Solarium",      value: "solarium" },
]

interface FiltersProps {
  district: string
  service: string
  search: string
  source: string
  sortBy: string
  onDistrictChange: (v: string) => void
  onServiceChange:  (v: string) => void
  onSearchChange:   (v: string) => void
  onSourceChange:   (v: string) => void
  onSortChange:     (v: string) => void
  total: number
  view: ViewMode
  onViewChange: (v: ViewMode) => void
}

export function Filters({
  district,
  service,
  search,
  source,
  sortBy,
  onDistrictChange,
  onServiceChange,
  onSearchChange,
  onSourceChange,
  onSortChange,
  total,
  view,
  onViewChange,
}: FiltersProps) {
  const { data: districts } = useSWR<string[]>("/api/salons/districts", swrFetcher)

  // Active chip value — matches SERVICE_CHIPS[n].value, or "" for "All".
  const activeValue = service || ""

  // User types in the search box → clear the chip-service filter, propagate search value up.
  const handleTextChange = (v: string) => {
    onSearchChange(v)
    onServiceChange("")   // deactivate any active chip
  }

  // User clicks a chip → clear the free-text search, set service filter.
  const handleChipClick = (value: string) => {
    onServiceChange(value)
    onSearchChange("")    // clear the text box
  }

  // "Clear filters" button resets filters (district, service, search, source).
  // Sort order is a preference — intentionally not cleared.
  const handleClearAll = () => {
    onDistrictChange("")
    onServiceChange("")
    onSearchChange("")
    onSourceChange("")
  }

  const hasFilters = district || service || search || source

  return (
    <div className="bg-white border-b border-border sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">

        {/* ── Row 1: text search + district dropdown + view toggle + clear + count ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Free-text search: name OR service */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search by name or service (e.g. Dorota, barber…)"
              value={search}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-cream border border-border rounded-lg
                         focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose/20
                         placeholder:text-muted transition-colors"
            />
            {search && (
              <button
                onClick={() => handleTextChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* District dropdown */}
          <div className="relative shrink-0">
            <SlidersHorizontal
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
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

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <ArrowUpDown
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm bg-cream border border-border rounded-lg
                         appearance-none focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose/20
                         text-ink cursor-pointer transition-colors"
            >
              {SORT_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Source filter dropdown */}
          <div className="relative shrink-0">
            <Database
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <select
              value={source}
              onChange={(e) => onSourceChange(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm bg-cream border border-border rounded-lg
                         appearance-none focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose/20
                         text-ink cursor-pointer transition-colors"
            >
              {SOURCE_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* ── List / Map toggle ── */}
          <div className="flex items-center shrink-0 border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => onViewChange("list")}
              className={[
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-rose text-white"
                  : "bg-cream text-muted hover:text-ink hover:bg-border/30",
              ].join(" ")}
              aria-label="List view"
            >
              <LayoutList size={13} />
              List
            </button>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={() => onViewChange("map")}
              className={[
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                view === "map"
                  ? "bg-rose text-white"
                  : "bg-cream text-muted hover:text-ink hover:bg-border/30",
              ].join(" ")}
              aria-label="Map view"
            >
              <Map size={13} />
              Map
            </button>
          </div>

          {/* Clear all filters */}
          {hasFilters && (
            <button
              onClick={handleClearAll}
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

        {/* ── Row 2: service chip row (static taxonomy) ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {/* "All" chip */}
          <button
            onClick={() => handleChipClick("")}
            className={[
              "shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap",
              activeValue === ""
                ? "bg-rose border-rose text-white"
                : "bg-transparent border-rose text-rose hover:bg-rose/10",
            ].join(" ")}
          >
            All
          </button>

          {SERVICE_CHIPS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handleChipClick(value)}
              className={[
                "shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors whitespace-nowrap",
                activeValue === value
                  ? "bg-rose border-rose text-white"
                  : "bg-transparent border-rose text-rose hover:bg-rose/10",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
