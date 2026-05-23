"use client"

/**
 * MapView — dynamic wrapper around SalonMap.
 *
 * Leaflet requires `window`; next/dynamic with ssr:false ensures it only
 * ever runs in the browser.
 */

import dynamic from "next/dynamic"
import type { SalonMapProps } from "./SalonMap"

const SalonMapDynamic = dynamic(
  () => import("./SalonMap").then((m) => m.SalonMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-xl border border-border bg-cream animate-pulse"
        style={{ height: "calc(100vh - 240px)", minHeight: 480 }}
      />
    ),
  },
)

export function MapView(props: SalonMapProps) {
  return <SalonMapDynamic {...props} />
}
