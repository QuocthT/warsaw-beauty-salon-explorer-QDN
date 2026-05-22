"use client"

import { Star } from "lucide-react"
import clsx from "clsx"

interface StarRatingProps {
  rating: number | null
  reviewCount?: number | null
  size?: "sm" | "md"
}

export function StarRating({ rating, reviewCount, size = "sm" }: StarRatingProps) {
  if (!rating) return <span className="text-muted text-xs">No rating</span>

  const filled = Math.round(rating)
  const iconSize = size === "sm" ? 12 : 16

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={iconSize}
            className={clsx(
              i < filled ? "fill-gold text-gold" : "fill-transparent text-border",
            )}
          />
        ))}
      </div>
      <span className={clsx("font-medium text-ink", size === "sm" ? "text-xs" : "text-sm")}>
        {rating.toFixed(1)}
      </span>
      {reviewCount != null && (
        <span className={clsx("text-muted", size === "sm" ? "text-xs" : "text-sm")}>
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  )
}
