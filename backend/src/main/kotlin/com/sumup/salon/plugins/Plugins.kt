package com.sumup.salon.plugins

import com.sumup.salon.models.ApiError
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import kotlinx.serialization.json.Json

fun Application.configureSerialization() {
    install(ContentNegotiation) {
        json(Json {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
            // camelCase in JSON (reviewCount, not review_count)
            // matches frontend expectations
        })
    }
}

fun Application.configureCORS() {
    install(CORS) {
        // Allow the Next.js dev server and production frontend
        allowHost("localhost:3000")
        allowHost("localhost:3001")
        // In production, replace with your actual domain:
        // allowHost("warsaw-salons.example.com", schemes = listOf("https"))

        allowHeader(HttpHeaders.ContentType)
        allowHeader(HttpHeaders.Authorization)
        allowMethod(HttpMethod.Options)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Patch)
    }
}

fun Application.configureErrorHandling() {
    install(StatusPages) {
        // Unhandled exceptions → 500
        exception<Throwable> { call, cause ->
            call.application.log.error("Unhandled error", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                ApiError("INTERNAL_ERROR", "An unexpected error occurred"),
            )
        }

        // 404 for routes that don't exist
        status(HttpStatusCode.NotFound) { call, _ ->
            call.respond(
                HttpStatusCode.NotFound,
                ApiError("NOT_FOUND", "The requested resource was not found"),
            )
        }
    }
}
