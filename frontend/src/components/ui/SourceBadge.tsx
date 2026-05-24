import clsx from "clsx"

const SOURCE_LABELS: Record<string, string> = {
  booksy: "Booksy",
  google: "Google",
  osm:    "OpenStreetMap",
}

const SOURCE_COLORS: Record<string, string> = {
  booksy: "bg-purple-100 text-purple-700 border-purple-200",
  google: "bg-blue-100 text-blue-700 border-blue-200",
  osm:    "bg-green-100 text-green-700 border-green-200",
}

interface SourceBadgeProps {
  source: string
  className?: string
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        SOURCE_COLORS[source] ?? "bg-gray-100 text-gray-600 border-gray-200",
        className,
      )}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  )
}
