// Mirrors Kotlin's SalonSummary — used on the listing page
export interface SalonSummary {
  id: number
  name: string
  address: string
  district: string
  rating: number | null
  reviewCount: number | null
  priceRange: string | null
  services: string | null
  source: string
  latitude: number | null
  longitude: number | null
}

// Mirrors Kotlin's SalonDetail — used on the detail page
export interface SalonDetail {
  id: number
  name: string
  address: string
  district: string
  phone: string | null
  website: string | null
  services: string | null
  priceRange: string | null
  rating: number | null
  reviewCount: number | null
  source: string
  sourceUrl: string | null
  latitude: number | null
  longitude: number | null
  createdAt: string
  updatedAt: string
}

// Mirrors Kotlin's SalonUpdateRequest
export interface SalonUpdateRequest {
  name?: string
  address?: string
  district?: string
  phone?: string
  website?: string
  services?: string
  priceRange?: string
  rating?: number
  reviewCount?: number
}

// Mirrors Kotlin's PagedResponse<T>
export interface PagedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
