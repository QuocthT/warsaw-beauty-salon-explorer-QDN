import clsx from "clsx"

interface PriceBadgeProps {
  priceRange: string | null
  className?: string
}

export function PriceBadge({ priceRange, className }: PriceBadgeProps) {
  if (!priceRange) return null

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        "bg-blush/40 text-rose border border-blush",
        className,
      )}
    >
      {priceRange}
    </span>
  )
}
