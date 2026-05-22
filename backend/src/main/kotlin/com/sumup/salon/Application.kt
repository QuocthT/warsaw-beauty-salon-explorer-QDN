package com.sumup.salon

import com.sumup.salon.plugins.configureCORS
import com.sumup.salon.plugins.configureErrorHandling
import com.sumup.salon.plugins.configureSerialization
import com.sumup.salon.repository.SalonRepository
import com.sumup.salon.repository.SalonTable
import com.sumup.salon.routes.salonRoutes
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.transactions.transaction
import org.slf4j.event.Level
import java.io.File

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0") {
        module()
    }.start(wait = true)
}

fun Application.module() {
    // ── Database ──────────────────────────────────────────────────────────────
    // Skip DB setup if a connection is already configured (e.g. in tests)
    if (!isTestEnvironment()) {
        val dbPath = System.getenv("DB_PATH") ?: resolveDbPath()
        log.info("Connecting to database at $dbPath")

        Database.connect(
            url    = "jdbc:sqlite:$dbPath",
            driver = "org.sqlite.JDBC",
        )
    }

    // Ensure the schema exists (safe on already-populated DB and in-memory test DB)
    transaction {
        SchemaUtils.createMissingTablesAndColumns(SalonTable)
    }

    // ── Plugins ───────────────────────────────────────────────────────────────
    configureSerialization()
    configureCORS()
    configureErrorHandling()

    install(CallLogging) {
        level = Level.INFO
    }

    // ── Routes ────────────────────────────────────────────────────────────────
    val repo = SalonRepository()

    routing {
        // Health check — used by Docker Compose depends_on
        get("/health") {
            call.respond(mapOf("status" to "ok"))
        }

        salonRoutes(repo)
    }
}

/**
 * Returns true when running inside a test — detected by the presence of
 * an active Exposed connection (tests set one up before calling module()).
 */
private fun isTestEnvironment(): Boolean =
    try {
        org.jetbrains.exposed.sql.transactions.TransactionManager.currentOrNull() != null ||
        System.getProperty("test.environment") == "true"
    } catch (e: Exception) {
        false
    }

/**
 * Resolves the DB path relative to the project root, regardless of
 * where `./gradlew run` is invoked from.
 *
 * Search order:
 *   1. ./data/salons.db          (running from backend/)
 *   2. ../data/salons.db         (running from project root)
 *   3. /app/data/salons.db       (Docker container)
 */
private fun resolveDbPath(): String {
    val candidates = listOf(
        "data/salons.db",
        "../data/salons.db",
        "/app/data/salons.db",
    )
    return candidates.firstOrNull { File(it).exists() }
        ?: "../data/salons.db".also {
            File("../data").mkdirs()
        }
}
