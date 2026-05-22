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
  service?: string
  page?: number
  pageSize?: number
}

export function buildSalonListUrl(params: ListParams): string {
  const q = new URLSearchParams()
  if (params.district) q.set("district", params.district)
  if (params.service)  q.set("service",  params.service)
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
