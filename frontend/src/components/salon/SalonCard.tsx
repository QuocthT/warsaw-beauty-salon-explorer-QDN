"use client"

import Link from "next/link"
import { MapPin, Scissors } from "lucide-react"
import type { SalonSummary } from "@/types/salon"
import { StarRating } from "@/components/ui/StarRating"
import { PriceBadge } from "@/components/ui/PriceBadge"
import { SourceBadge } from "@/components/ui/SourceBadge"

interface SalonCardProps {
  salon: SalonSummary
  index: number
}

/** Keyword → display label mappings for name-based tag inference.
 *  Each entry is [regex-pattern (case-insensitive), label].
 *  Order matters: first match wins per rule, but multiple rules can fire. */
const NAME_RULES: [RegExp, string][] = [
  [/barber/i,                       "Barber"],
  [/fryzjer|hair\s*salon|hair\s*florist/i, "Fryzjer"],
  [/kosmetyk|estetic|esthetic|beauty\s*clinic|klinika urody/i, "Kosmetyka"],
  [/paznokc|nail|manicur|pedicur/i, "Paznokcie"],
  [/brwi|rz[eę]s|lash|brow/i,      "Brwi & Rzęsy"],
  [/spa|masaż|masaz/i,              "Spa & Masaż"],
  [/depilac|wax/i,                  "Depilacja"],
  [/tatuaż|tattoo/i,                "Tatuaż"],
  [/figura|sylwetk|slim|body/i,     "Sylwetka"],
  [/solarium|opalenizn/i,           "Solarium"],
]

function inferFromName(name: string): string[] {
  const tags: string[] = []
  for (const [pattern, label] of NAME_RULES) {
    if (pattern.test(name) && !tags.includes(label)) {
      tags.push(label)
    }
  }
  return tags.slice(0, 3)
}

export function SalonCard({ salon, index }: SalonCardProps) {
  // Use explicit services when available; fall back to name inference.
  const explicitServices = salon.services
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? []

  const serviceList = explicitServices.length > 0
    ? explicitServices.slice(0, 3)
    : inferFromName(salon.name)

  const isInferred = explicitServices.length === 0 && serviceList.length > 0

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
          <h3
            title={salon.name}
            className="font-display text-base font-semibold text-ink leading-snug
                       group-hover:text-rose transition-colors truncate"
          >
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

      {/* Services — explicit DB tags, or inferred from the salon name */}
      {serviceList.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Scissors size={11} className="text-muted shrink-0" />
          {serviceList.map((s) => (
            <span
              key={s}
              className={[
                "text-xs px-2 py-0.5 rounded-full border",
                isInferred
                  ? "text-muted/70 bg-transparent border-border/60 italic"
                  : "text-muted bg-cream border-border",
              ].join(" ")}
            >
              {s}
            </span>
          ))}
          {explicitServices.length > 3 && (
            <span className="text-xs text-muted">
              +{explicitServices.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Bottom — address + source badge */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="text-xs text-muted truncate">{salon.address}</p>
        <SourceBadge source={salon.source} className="shrink-0" />
      </div>
    </Link>
  )
}
