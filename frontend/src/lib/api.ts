import type { PagedResponse, SalonDetail, SalonSummary, SalonUpdateRequest } from "@/types/salon"

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080"

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? "API error")
  }
  return res.json()
}

// ── Salons ────────────────────────────────────────────────────────────────────

export interface ListParams {
  district?: string
  service?: string    // chip-selected service filter
  search?: string     // free-text: matches name OR services
  source?: string     // data-source filter: "booksy" | "google" | "osm"
  sortBy?: string     // sort order: "reviews" (default) | "rating" | "name"
  minRating?: number  // minimum rating threshold (0 = no filter)
  minReviews?: number // minimum review count — filters statistically unreliable ratings
  page?: number
  pageSize?: number
}

export function buildSalonListUrl(params: ListParams): string {
  const q = new URLSearchParams()
  if (params.district) q.set("district", params.district)
  if (params.service)  q.set("service",  params.service)
  if (params.search)   q.set("search",   params.search)
  if (params.source)   q.set("source",   params.source)
  // Only send sortBy when it differs from the backend default ("reviews") so
  // existing bookmarks without the param continue to show the right order.
  if (params.sortBy && params.sortBy !== "reviews") q.set("sortBy", params.sortBy)
  if (params.minRating  && params.minRating  > 0) q.set("minRating",  String(params.minRating))
  if (params.minReviews && params.minReviews > 0) q.set("minReviews", String(params.minReviews))
  if (params.page)     q.set("page",     String(params.page))
  if (params.pageSize) q.set("pageSize", String(params.pageSize))
  const qs = q.toString()
  return `/api/salons${qs ? `?${qs}` : ""}`
}

export function fetchSalons(params: ListParams): Promise<PagedResponse<SalonSummary>> {
  return apiFetch(buildSalonListUrl(params))
}

export function fetchSalon(id: number): Promise<SalonDetail> {
  return apiFetch(`/api/salons/${id}`)
}

export function fetchDistricts(): Promise<string[]> {
  return apiFetch("/api/salons/districts")
}

export function fetchServices(): Promise<string[]> {
  return apiFetch("/api/salons/services")
}

export function updateSalon(id: number, data: SalonUpdateRequest): Promise<SalonDetail> {
  return apiFetch(`/api/salons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

// ── SWR fetcher (used by useSWR hooks) ────────────────────────────────────────
export const swrFetcher = (url: string) =>
  fetch(`${BASE}${url}`).then((r) => {
    if (!r.ok) throw new Error("Fetch failed")
    return r.json()
  })
