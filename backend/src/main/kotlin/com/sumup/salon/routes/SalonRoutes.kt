package com.sumup.salon.routes

import com.sumup.salon.models.ApiError
import com.sumup.salon.models.PagedResponse
import com.sumup.salon.models.SalonUpdateRequest
import com.sumup.salon.repository.SalonRepository
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun Route.salonRoutes(repo: SalonRepository) {

    route("/api/salons") {

        /**
         * GET /api/salons
         *
         * Query params:
         *   district  — filter by district name (e.g. "Mokotów")
         *   service   — filter by service substring from chip selection (e.g. "Barber")
         *   search    — free-text search matching name OR services (e.g. "dorota")
         *   page      — page number, default 1
         *   pageSize  — records per page, default 20, max 5000
         */
        get {
            val district   = call.request.queryParameters["district"]?.takeIf { it.isNotBlank() }
            val service    = call.request.queryParameters["service"]?.takeIf { it.isNotBlank() }
            val search     = call.request.queryParameters["search"]?.takeIf { it.isNotBlank() }
            val source     = call.request.queryParameters["source"]?.takeIf { it.isNotBlank() }
            val sortBy     = call.request.queryParameters["sortBy"]?.takeIf { it.isNotBlank() }
            val minRating  = call.request.queryParameters["minRating"]?.toDoubleOrNull()
                ?.coerceIn(0.0, 5.0)
                ?.takeIf { it > 0.0 }
            // Minimum review count — callers pass 5 when sorting by rating to
            // exclude salons whose score is based on a single review.
            val minReviews = call.request.queryParameters["minReviews"]?.toIntOrNull()
                ?.coerceAtLeast(0)
                ?.takeIf { it > 0 }
            val page       = call.request.queryParameters["page"]?.toIntOrNull()?.coerceAtLeast(1) ?: 1
            val pageSize   = call.request.queryParameters["pageSize"]?.toIntOrNull()
                ?.coerceIn(1, 5000) ?: 20

            val (salons, total) = repo.listSalons(district, service, search, source, sortBy, page, pageSize, minRating, minReviews)

            call.respond(
                PagedResponse(
                    data     = salons,
                    total    = total,
                    page     = page,
                    pageSize = pageSize,
                )
            )
        }

        // ── Static sub-routes ──────────────────────────────────────────────
        // ALL static sub-routes must be declared BEFORE /{id}.
        // Ktor evaluates routes top-to-bottom; if /{id} comes first it
        // swallows literals like "districts" and "services" as the id param,
        // returning a 400/404 instead of the intended response.

        /**
         * GET /api/salons/districts
         * Returns all distinct district names — used to populate the filter dropdown.
         */
        get("/districts") {
            call.respond(repo.listDistricts())
        }

        /**
         * GET /api/salons/services
         * Returns the top-20 service tokens by frequency — used to populate
         * the service chip row on the listing page.
         */
        get("/services") {
            call.respond(repo.listServices())
        }

        /**
         * GET /api/salons/{id}
         * Returns full details for a single salon.
         */
        get("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@get call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("BAD_REQUEST", "id must be an integer"),
                )

            val salon = repo.getSalon(id)
                ?: return@get call.respond(
                    HttpStatusCode.NotFound,
                    ApiError("NOT_FOUND", "Salon with id=$id not found"),
                )

            call.respond(salon)
        }

        /**
         * PATCH /api/salons/{id}
         * Partially updates a salon. Only provided fields are changed.
         *
         * Example body:
         *   { "phone": "+48 600 123 456", "services": "Fryzjer, Barber" }
         */
        patch("/{id}") {
            val id = call.parameters["id"]?.toIntOrNull()
                ?: return@patch call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("BAD_REQUEST", "id must be an integer"),
                )

            val req = runCatching { call.receive<SalonUpdateRequest>() }.getOrElse {
                return@patch call.respond(
                    HttpStatusCode.BadRequest,
                    ApiError("BAD_REQUEST", "Invalid request body: ${it.message}"),
                )
            }

            val updated = repo.updateSalon(id, req)
                ?: return@patch call.respond(
                    HttpStatusCode.NotFound,
                    ApiError("NOT_FOUND", "Salon with id=$id not found"),
                )

            call.respond(updated)
        }
    }
}
