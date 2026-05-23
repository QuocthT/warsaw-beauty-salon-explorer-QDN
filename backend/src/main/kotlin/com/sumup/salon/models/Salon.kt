package com.sumup.salon.models

import kotlinx.serialization.Serializable

/**
 * Lightweight DTO returned in the listing page.
 * Keeps the list response small — only the fields the UI needs at a glance.
 * lat/lng are included so the map view can render pins without a detail fetch.
 */
@Serializable
data class SalonSummary(
    val id: Int,
    val name: String,
    val address: String,
    val district: String,
    val rating: Double?,
    val reviewCount: Int?,
    val priceRange: String?,
    val services: String?,
    val source: String,
    val latitude: Double?,
    val longitude: Double?,
)

/**
 * Full DTO returned on the detail view — every field we have.
 */
@Serializable
data class SalonDetail(
    val id: Int,
    val name: String,
    val address: String,
    val district: String,
    val phone: String?,
    val website: String?,
    val services: String?,
    val priceRange: String?,
    val rating: Double?,
    val reviewCount: Int?,
    val source: String,
    val sourceUrl: String?,
    val latitude: Double?,
    val longitude: Double?,
    val createdAt: String,
    val updatedAt: String,
)

/**
 * Payload accepted by PATCH /api/salons/{id}.
 * All fields are optional — only provided fields are updated.
 */
@Serializable
data class SalonUpdateRequest(
    val name: String? = null,
    val address: String? = null,
    val district: String? = null,
    val phone: String? = null,
    val website: String? = null,
    val services: String? = null,
    val priceRange: String? = null,
    val rating: Double? = null,
    val reviewCount: Int? = null,
)

/**
 * Paginated list response wrapper.
 */
@Serializable
data class PagedResponse<T>(
    val data: List<T>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
)

/**
 * Standard error envelope.
 */
@Serializable
data class ApiError(
    val error: String,
    val message: String,
)
