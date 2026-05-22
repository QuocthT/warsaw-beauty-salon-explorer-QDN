"use client"

import Link from "next/link"
import { MapPin, Scissors } from "lucide-react"
import type { SalonSummary } from "@/types/salon"
import { StarRating } from "@/components/ui/StarRating"
import { PriceBadge } from "@/components/ui/PriceBadge"

interface SalonCardProps {
  salon: SalonSummary
  index: number
}

export function SalonCard({ salon, index }: SalonCardProps) {
  const serviceList = salon.services
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3) ?? []

  const staggerClass = `stagger-${Math.min(index % 5 + 1, 5)}`

  return (
    <Link
      href={`/salons/${salon.id}`}
      className={`
        group block bg-white border border-border rounded-xl p-5
        card-hover animate-fade-up opacity-0 ${staggerClass}
        hover:border-rose/40
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base font-semibold text-ink leading-snug
                         group-hover:text-rose transition-colors truncate">
            {salon.name}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-muted">
            <MapPin size={11} className="shrink-0" />
            <span className="text-xs truncate">{salon.district}</span>
          </div>
        </div>
        <PriceBadge priceRange={salon.priceRange} className="shrink-0" />
      </div>

      {/* Rating */}
      <div className="mb-3">
        <StarRating rating={salon.rating} reviewCount={salon.reviewCount} />
      </div>

      {/* Services */}
      {serviceList.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Scissors size={11} className="text-muted shrink-0" />
          {serviceList.map((s) => (
            <span
              key={s}
              className="text-xs text-muted bg-cream px-2 py-0.5 rounded-full border border-border"
            >
              {s}
            </span>
          ))}
          {(salon.services?.split(",").length ?? 0) > 3 && (
            <span className="text-xs text-muted">
              +{(salon.services?.split(",").length ?? 0) - 3} more
            </span>
          )}
        </div>
      )}

      {/* Bottom — address */}
      <p className="mt-3 text-xs text-muted truncate border-t border-border/60 pt-3">
        {salon.address}
      </p>
    </Link>
  )
}
