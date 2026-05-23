"use client"

/**
 * SalonMap — plain Leaflet via useRef + useEffect.
 *
 * We deliberately avoid react-leaflet's <MapContainer> because it
 * instantiates the Leaflet map during the render phase.  React 18
 * StrictMode double-renders in dev, so the second render hits a DOM
 * node that already has a Leaflet instance → "Map container is already
 * initialized".  Managing the map ourselves in useEffect gives us a
 * proper cleanup/re-init cycle that survives StrictMode.
 */

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { SalonSummary } from "@/types/salon"

const WARSAW: L.LatLngTuple = [52.2297, 21.0122]
const DEFAULT_ZOOM = 12

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

export interface SalonMapProps {
  salons: SalonSummary[]
  isLoading?: boolean
  /** Passed as false while the parent wrapper is display:none; triggers invalidateSize on reveal. */
  visible?: boolean
}

export function SalonMap({ salons, isLoading, visible = true }: SalonMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const layerRef     = useRef<L.LayerGroup | null>(null)

  // ── 1. Create / destroy the map ─────────────────────────────────────────
  // Empty-dep effect: runs exactly once per real mount.
  // The `mapRef.current` guard prevents a second init if React ever
  // runs the effect twice without the cleanup in between (edge-case safety).
  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return           // already initialised

    const map = L.map(el, { center: WARSAW, zoom: DEFAULT_ZOOM })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    const layer = L.layerGroup().addTo(map)
    mapRef.current   = map
    layerRef.current = layer

    return () => {
      layer.remove()
      map.remove()
      mapRef.current   = null
      layerRef.current = null
    }
  }, [])

  // ── 2. Sync markers whenever salons change ───────────────────────────────
  // Also runs on every real mount (React always fires effects on mount,
  // regardless of deps), so the first batch of data is painted correctly
  // after the StrictMode remount cycle.
  useEffect(() => {
    const map   = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return                  // map not ready yet

    layer.clearLayers()

    const geo = salons.filter(s => s.latitude != null && s.longitude != null)
    if (geo.length === 0) return

    for (const salon of geo) {
      L.circleMarker(
        [salon.latitude!, salon.longitude!],
        { radius: 9, fillColor: "#c4614a", color: "#fff", weight: 2, fillOpacity: 0.88 },
      )
      .bindPopup(
        `<div style="min-width:180px;font-family:DM Sans,sans-serif">
           <p style="font-weight:600;font-size:14px;color:#1a1a1a;margin:0 0 4px">${esc(salon.name)}</p>
           <p style="font-size:12px;color:#6b6b6b;margin:0 0 2px">📍 ${esc(salon.district)}</p>
           ${salon.rating != null
             ? `<p style="font-size:12px;color:#6b6b6b;margin:0 0 2px">⭐ ${salon.rating.toFixed(1)}${
                 salon.reviewCount != null
                   ? ` <span style="color:#9b9b9b">(${salon.reviewCount})</span>`
                   : ""
               }</p>`
             : ""}
           ${salon.priceRange ? `<p style="font-size:12px;color:#6b6b6b;margin:0 0 6px">${esc(salon.priceRange)}</p>` : ""}
           <a href="/salons/${salon.id}"
              style="display:inline-block;margin-top:6px;font-size:12px;color:#c4614a;text-decoration:none;font-weight:500">
             View details →
           </a>
         </div>`,
        { minWidth: 180 },
      )
      .addTo(layer)
    }

    const bounds = L.latLngBounds(geo.map(s => [s.latitude!, s.longitude!] as L.LatLngTuple))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
  }, [salons])

  // ── 3. Fix tile gaps when revealed after display:none ───────────────────
  useEffect(() => {
    if (!visible || !mapRef.current) return
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 50)
    return () => clearTimeout(id)
  }, [visible])

  const geoCount = salons.filter(s => s.latitude != null && s.longitude != null).length
  const missing  = salons.length - geoCount

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-border"
      style={{ height: "calc(100vh - 240px)", minHeight: 480 }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[9999] bg-white/70 flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-muted">
            <svg className="animate-spin w-4 h-4 text-rose" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
            </svg>
            Loading salons…
          </div>
        </div>
      )}

      {/* The div Leaflet mounts into */}
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />

      {/* Salons without coordinates */}
      {missing > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 border border-border
                        rounded-lg px-3 py-1.5 text-xs text-muted shadow-sm">
          {geoCount} plotted · {missing} without coordinates
        </div>
      )}

      {/* Pin count */}
      {geoCount > 0 && (
        <div className="absolute top-4 right-4 z-[1000] bg-rose text-white
                        rounded-full px-3 py-1 text-xs font-medium shadow-sm">
          {geoCount} salon{geoCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  )
}
