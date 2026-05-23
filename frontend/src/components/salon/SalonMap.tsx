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

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { LocateFixed } from "lucide-react"
import type { SalonSummary } from "@/types/salon"

const WARSAW: L.LatLngTuple = [52.2297, 21.0122]
const DEFAULT_ZOOM = 12

// ── helpers ──────────────────────────────────────────────────────────────────

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;")
}

/** Haversine great-circle distance in km. */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R    = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── types ─────────────────────────────────────────────────────────────────────

type GeoState = "idle" | "loading" | "active" | "denied" | "unavailable"

interface UserLocation { lat: number; lng: number }

export interface SalonMapProps {
  salons: SalonSummary[]
  isLoading?: boolean
  /** Passed as false while the parent wrapper is display:none; triggers invalidateSize on reveal. */
  visible?: boolean
}

// ── component ─────────────────────────────────────────────────────────────────

export function SalonMap({ salons, isLoading, visible = true }: SalonMapProps) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const mapRef        = useRef<L.Map | null>(null)
  const layerRef      = useRef<L.LayerGroup | null>(null)
  const userMarkerRef = useRef<L.CircleMarker | null>(null)

  const [geoState,     setGeoState]     = useState<GeoState>("idle")
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)

  // ── 1. Create / destroy the map ─────────────────────────────────────────
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

  // ── 2. Sync salon markers whenever salons or userLocation changes ────────
  useEffect(() => {
    const map   = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()

    let geo = salons.filter(s => s.latitude != null && s.longitude != null)
    if (geo.length === 0) return

    // Sort nearest-first when the user's location is known
    if (userLocation) {
      geo = [...geo].sort((a, b) =>
        haversineKm(userLocation.lat, userLocation.lng, a.latitude!, a.longitude!) -
        haversineKm(userLocation.lat, userLocation.lng, b.latitude!, b.longitude!),
      )
    }

    for (const salon of geo) {
      const km = userLocation
        ? haversineKm(userLocation.lat, userLocation.lng, salon.latitude!, salon.longitude!)
        : null

      const distLine = km != null
        ? `<p style="font-size:12px;color:#2563eb;font-weight:500;margin:0 0 4px">
             📍 ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} away
           </p>`
        : ""

      L.circleMarker(
        [salon.latitude!, salon.longitude!],
        { radius: 9, fillColor: "#c4614a", color: "#fff", weight: 2, fillOpacity: 0.88 },
      )
      .bindPopup(
        `<div style="min-width:180px;font-family:DM Sans,sans-serif">
           <p style="font-weight:600;font-size:14px;color:#1a1a1a;margin:0 0 4px">${esc(salon.name)}</p>
           <p style="font-size:12px;color:#6b6b6b;margin:0 0 2px">🗺 ${esc(salon.district)}</p>
           ${distLine}
           ${salon.rating != null
             ? `<p style="font-size:12px;color:#6b6b6b;margin:0 0 2px">⭐ ${salon.rating.toFixed(1)}${
                 salon.reviewCount != null
                   ? ` <span style="color:#9b9b9b">(${salon.reviewCount})</span>`
                   : ""
               }</p>`
             : ""}
           ${salon.priceRange
             ? `<p style="font-size:12px;color:#6b6b6b;margin:0 0 6px">${esc(salon.priceRange)}</p>`
             : ""}
           <a href="/salons/${salon.id}"
              style="display:inline-block;margin-top:6px;font-size:12px;color:#c4614a;
                     text-decoration:none;font-weight:500">
             View details →
           </a>
         </div>`,
        { minWidth: 180 },
      )
      .addTo(layer)
    }

    // Fit bounds to all salons only on initial data load (not when re-sorting by distance)
    if (!userLocation) {
      const bounds = L.latLngBounds(geo.map(s => [s.latitude!, s.longitude!] as L.LatLngTuple))
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
    }
  }, [salons, userLocation])

  // ── 3. Manage the blue "you are here" marker ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    userMarkerRef.current?.remove()
    userMarkerRef.current = null

    if (!userLocation) return

    userMarkerRef.current = L.circleMarker(
      [userLocation.lat, userLocation.lng],
      { radius: 10, fillColor: "#2563eb", color: "#fff", weight: 3, fillOpacity: 1 },
    )
    .bindPopup(
      `<strong style="font-family:DM Sans,sans-serif;font-size:13px">📍 You are here</strong>`,
    )
    .addTo(map)
  }, [userLocation])

  // ── 4. Fix tile gaps when revealed after display:none ───────────────────
  useEffect(() => {
    if (!visible || !mapRef.current) return
    const id = setTimeout(() => mapRef.current?.invalidateSize(), 50)
    return () => clearTimeout(id)
  }, [visible])

  // ── Geolocation handler ──────────────────────────────────────────────────
  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setGeoState("unavailable")
      return
    }

    // Toggle off — reset to full-city view
    if (geoState === "active") {
      setGeoState("idle")
      setUserLocation(null)
      const geo = salons.filter(s => s.latitude != null && s.longitude != null)
      if (geo.length > 0 && mapRef.current) {
        const bounds = L.latLngBounds(
          geo.map(s => [s.latitude!, s.longitude!] as L.LatLngTuple),
        )
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
      }
      return
    }

    setGeoState("loading")

    // ← this call is what triggers the browser's "Allow location?" prompt
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setGeoState("active")
        mapRef.current?.flyTo([latitude, longitude], 14, { duration: 1.2 })
      },
      (err) => {
        // GeolocationPositionError.PERMISSION_DENIED === 1
        setGeoState(err.code === 1 ? "denied" : "idle")
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  // ── derived values ────────────────────────────────────────────────────────
  const geoCount = salons.filter(s => s.latitude != null && s.longitude != null).length
  const missing  = salons.length - geoCount

  const nearMeLabel =
    geoState === "loading"     ? "Locating…"      :
    geoState === "active"      ? "Near me ✓"      :
    geoState === "denied"      ? "Location denied":
    geoState === "unavailable" ? "Not supported"  :
    "Near me"

  const nearMeClass = [
    "absolute z-[1000] flex items-center gap-1.5",
    "px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm border transition-colors",
    // position: bottom-right, clear of OSM attribution (~24 px) and the missing-count badge
    "bottom-[52px] right-4",
    geoState === "active"
      ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-700"
      : geoState === "denied" || geoState === "unavailable"
      ? "bg-white text-red-500 border-red-200 cursor-default"
      : "bg-white text-ink border-border hover:border-rose hover:text-rose",
  ].join(" ")

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

      {/* ── Near me button ─────────────────────────────────────────────── */}
      <button
        onClick={handleNearMe}
        disabled={geoState === "loading" || geoState === "unavailable" || geoState === "denied"}
        className={nearMeClass}
        title={
          geoState === "denied"
            ? "Location access was denied. Enable it in your browser settings and try again."
            : geoState === "unavailable"
            ? "Your browser doesn't support geolocation."
            : geoState === "active"
            ? "Click to reset to the full-city view"
            : "Sort salons by distance from your location"
        }
        aria-label="Sort salons by distance from your location"
      >
        {geoState === "loading" ? (
          <svg className="animate-spin w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
          </svg>
        ) : (
          <LocateFixed size={12} className="shrink-0" />
        )}
        {nearMeLabel}
      </button>

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
