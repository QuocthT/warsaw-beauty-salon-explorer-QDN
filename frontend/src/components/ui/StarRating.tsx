"use client"

import { Star } from "lucide-react"
import clsx from "clsx"

interface StarRatingProps {
  rating: number | null
  reviewCount?: number | null
  size?: "sm" | "md"
}

/** Ratings based on fewer than this many reviews are treated as low-confidence. */
const MIN_RELIABLE_REVIEWS = 5

export function StarRating({ rating, reviewCount, size = "sm" }: StarRatingProps) {
  if (!rating) return <span className="text-muted text-xs">No rating</span>

  const filled = Math.round(rating)
  const iconSize = size === "sm" ? 12 : 16

  // A rating is "low confidence" when it's based on very few reviews — a single
  // 5-star review makes a salon look perfect when it isn't.
  const isLowConfidence =
    reviewCount !== null && reviewCount !== undefined && reviewCount < MIN_RELIABLE_REVIEWS

  return (
    <div className="flex items-center gap-1.5" title={isLowConfidence ? "Rating based on very few reviews" : undefined}>
      {/* Stars — dimmed when low-confidence */}
      <div className={clsx("flex items-center gap-0.5", isLowConfidence && "opacity-40")}>
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

      {/* Numeric score — muted when low-confidence */}
      <span className={clsx(
        "font-medium tabular-nums",
        isLowConfidence ? "text-muted" : "text-ink",
        size === "sm" ? "text-xs" : "text-sm",
      )}>
        {rating.toFixed(1)}
      </span>

      {/* Review count */}
      {reviewCount != null && (
        <span className={clsx(
          "text-muted",
          size === "sm" ? "text-xs" : "text-sm",
          isLowConfidence && "italic",
        )}>
          ({reviewCount === 1 ? "1 review" : `${reviewCount.toLocaleString()} reviews`})
        </span>
      )}
    </div>
  )
}
