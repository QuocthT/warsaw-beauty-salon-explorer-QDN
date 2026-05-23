/**
 * Skeleton placeholder that mirrors the SalonCard layout during SWR fetch.
 * Uses the same padding / border / rounded values so the grid doesn't jump.
 */
export function SalonCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-5 animate-pulse">
      {/* ── Header: name + district + price badge ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {/* salon name */}
          <div className="h-4 bg-border rounded-md w-3/4 mb-2" />
          {/* district pill */}
          <div className="flex items-center gap-1 mt-1">
            <div className="h-2 w-2 bg-border rounded-full" />
            <div className="h-3 bg-border rounded-md w-2/5" />
          </div>
        </div>
        {/* price badge */}
        <div className="h-5 w-10 bg-border rounded-full shrink-0" />
      </div>

      {/* ── Rating row ── */}
      <div className="flex items-center gap-1.5 mb-3">
        {/* 5 star dots */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-3 bg-border rounded-sm" />
        ))}
        {/* review count */}
        <div className="h-3 w-14 bg-border rounded-md ml-0.5" />
      </div>

      {/* ── Service tags ── */}
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 bg-border rounded-full shrink-0" />
        <div className="h-5 w-16 bg-border rounded-full" />
        <div className="h-5 w-20 bg-border rounded-full" />
        <div className="h-5 w-14 bg-border rounded-full" />
      </div>

      {/* ── Bottom: address + source badge ── */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <div className="h-3 bg-border rounded-md w-2/3" />
        <div className="h-5 w-16 bg-border rounded-full shrink-0" />
      </div>
    </div>
  )
}
