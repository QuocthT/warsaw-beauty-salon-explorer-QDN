"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import useSWR from "swr"
import Link from "next/link"
import {
  ArrowLeft, Phone, Globe, MapPin, Pencil,
  Star, ExternalLink, Scissors, Navigation,
} from "lucide-react"
import { swrFetcher } from "@/lib/api"
import type { SalonDetail } from "@/types/salon"
import { StarRating } from "@/components/ui/StarRating"
import { PriceBadge } from "@/components/ui/PriceBadge"
import { SourceBadge } from "@/components/ui/SourceBadge"
import { EditModal } from "@/components/salon/EditModal"

export default function SalonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const { data: salon, mutate, isLoading } =
    useSWR<SalonDetail>(`/api/salons/${id}`, swrFetcher)

  const [editOpen, setEditOpen] = useState(false)

  function handleSaved(updated: SalonDetail) {
    mutate(updated, false)  // update SWR cache without refetch
    setEditOpen(false)
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-4 bg-border rounded w-24 mb-8" />
        <div className="h-8 bg-border rounded w-2/3 mb-3" />
        <div className="h-4 bg-border rounded w-1/3 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-border rounded w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!salon) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Scissors size={32} className="text-border mx-auto mb-4" />
        <h2 className="font-display text-xl text-ink mb-2">Salon not found</h2>
        <Link href="/" className="text-sm text-rose underline">Back to list</Link>
      </div>
    )
  }

  const serviceList = salon.services
    ?.split(",").map((s) => s.trim()).filter(Boolean) ?? []

  const mapsUrl = salon.latitude && salon.longitude
    ? `https://www.google.com/maps?q=${salon.latitude},${salon.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(salon.name + " " + salon.address)}`

  return (
    <>
      <div className="min-h-screen">

        {/* Top bar */}
        <div className="bg-ink text-cream px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted hover:text-cream transition-colors"
            >
              <ArrowLeft size={15} /> Back to salons
            </Link>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium
                         bg-rose text-white rounded-lg hover:bg-rose/90 transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        </div>

        <main className="max-w-2xl mx-auto px-4 py-8 animate-fade-up">

          {/* Name + district */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-muted border border-border rounded-full px-3 py-1">
                {salon.district}
              </span>
              <PriceBadge priceRange={salon.priceRange} />
              <SourceBadge source={salon.source} />
            </div>
            <h1 className="font-display text-3xl font-bold text-ink leading-tight">
              {salon.name}
            </h1>
            <div className="mt-2">
              <StarRating rating={salon.rating} reviewCount={salon.reviewCount} size="md" />
            </div>
          </div>

          {/* Info cards */}
          <div className="space-y-3 mb-8">

            {/* Address */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 bg-white border border-border rounded-xl
                         hover:border-rose/40 transition-colors group"
            >
              <MapPin size={16} className="text-rose mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Address</p>
                <p className="text-sm text-ink">{salon.address}</p>
              </div>
              <Navigation size={13} className="text-muted group-hover:text-rose transition-colors shrink-0 mt-1" />
            </a>

            {/* Phone */}
            {salon.phone && (
              <a
                href={`tel:${salon.phone}`}
                className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl
                           hover:border-rose/40 transition-colors"
              >
                <Phone size={16} className="text-rose shrink-0" />
                <div>
                  <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Phone</p>
                  <p className="text-sm text-ink">{salon.phone}</p>
                </div>
              </a>
            )}

            {/* Website */}
            {salon.website && (
              <a
                href={salon.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-white border border-border rounded-xl
                           hover:border-rose/40 transition-colors group"
              >
                <Globe size={16} className="text-rose shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted uppercase tracking-wide mb-0.5">Website</p>
                  <p className="text-sm text-ink truncate">{salon.website}</p>
                </div>
                <ExternalLink size={13} className="text-muted group-hover:text-rose shrink-0" />
              </a>
            )}
          </div>

          {/* Services */}
          {serviceList.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display text-lg font-semibold text-ink mb-3 flex items-center gap-2">
                <Scissors size={16} className="text-rose" /> Services
              </h2>
              <div className="flex flex-wrap gap-2">
                {serviceList.map((s) => (
                  <span
                    key={s}
                    className="text-sm text-ink bg-white border border-border
                               px-3 py-1.5 rounded-full hover:border-rose/40 transition-colors"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source link */}
          {salon.sourceUrl && (
            <div className="pt-6 border-t border-border">
              <p className="text-xs text-muted mb-1">Data source</p>
              <a
                href={salon.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-rose hover:underline flex items-center gap-1"
              >
                View original listing <ExternalLink size={11} />
              </a>
            </div>
          )}

          {/* Timestamps */}
          <p className="text-xs text-muted/60 mt-6">
            Last updated: {new Date(salon.updatedAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric"
            })}
          </p>

        </main>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EditModal
          salon={salon}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
