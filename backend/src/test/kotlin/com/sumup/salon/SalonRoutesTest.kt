package com.sumup.salon

import com.sumup.salon.repository.SalonTable
import com.sumup.salon.repository.SalonRepository
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.SchemaUtils
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.transaction
import java.nio.file.Files
import java.nio.file.Path
import kotlin.test.*

/**
 * API route tests for Warsaw Salon Explorer.
 *
 * Uses Ktor's testApplication{} which spins up the full app in-memory
 * with a separate SQLite test DB — no real network, no real file system.
 *
 * Tests cover:
 *   - Happy path: list, detail, districts endpoint
 *   - Filter logic: district and service filters
 *   - Error handling: 404 for missing salon, 400 for bad id
 *   - Mutation: PATCH updates only supplied fields
 */
class SalonRoutesTest {

    // ── Test DB setup ─────────────────────────────────────────────────────────

    // Temp file per test — avoids in-memory SQLite connection-pool lifecycle issues
    // (named in-memory DBs are freed when all connections close between requests).
    private var tempDbPath: Path? = null

    @AfterTest
    fun tearDown() {
        tempDbPath?.toFile()?.delete()
    }

    private fun setupTestDb() {
        // Signal to Application.module() that we're in a test — skips real DB connect
        System.setProperty("test.environment", "true")
        // Fresh temp file per test — reliable, no shared-connection-pool gotchas
        tempDbPath = Files.createTempFile("salon_test_", ".db")
        Database.connect(
            url    = "jdbc:sqlite:${tempDbPath!!.toAbsolutePath()}",
            driver = "org.sqlite.JDBC",
        )
        transaction {
            SchemaUtils.create(SalonTable)
            seedTestData()
        }
    }

    private fun seedTestData() {
        // Insert a handful of known records so assertions are deterministic
        listOf(
            Triple("Salon Venus",       "ul. Mokotowska 5, Warszawa",   "Mokotów"),
            Triple("Barber Kings",      "ul. Marszałkowska 10, Warszawa","Śródmieście"),
            Triple("Nails by Lan",      "ul. Targowa 72, Warszawa",     "Praga-Północ"),
            Triple("Studio Urody Anna", "ul. Puławska 34, Warszawa",    "Mokotów"),
            Triple("Afro Hair Warsaw",  "ul. Wilcza 25, Warszawa",      "Śródmieście"),
        ).forEachIndexed { i, (name, address, district) ->
            SalonTable.insert {
                it[SalonTable.name]        = name
                it[SalonTable.address]     = address
                it[SalonTable.district]    = district
                it[SalonTable.rating]      = 4.0 + i * 0.1
                it[SalonTable.reviewCount] = 100 + i * 10
                it[SalonTable.services]    = if (name.contains("Barber")) "Barber, Strzyżenie" else "Fryzjer"
                it[SalonTable.dataSource]  = "test"
                it[SalonTable.createdAt]   = "2026-01-01T00:00:00"
                it[SalonTable.updatedAt]   = "2026-01-01T00:00:00"
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun testApp(block: suspend ApplicationTestBuilder.() -> Unit) {
        setupTestDb()
        testApplication {
            application { module() }
            block()
        }
    }

    private suspend fun HttpResponse.json(): JsonObject =
        Json.parseToJsonElement(bodyAsText()).jsonObject

    private suspend fun HttpResponse.jsonArray(): JsonArray =
        Json.parseToJsonElement(bodyAsText()).jsonArray

    // ── Health check ──────────────────────────────────────────────────────────

    @Test
    fun `health endpoint returns 200`() = testApp {
        val r = client.get("/health")
        assertEquals(HttpStatusCode.OK, r.status)
    }

    // ── GET /api/salons ───────────────────────────────────────────────────────

    @Test
    fun `list salons returns 200 with paged response`() = testApp {
        val r = client.get("/api/salons")
        assertEquals(HttpStatusCode.OK, r.status)

        val body = r.json()
        assertTrue(body.containsKey("data"))
        assertTrue(body.containsKey("total"))
        assertTrue(body.containsKey("page"))
        assertTrue(body.containsKey("pageSize"))

        val total = body["total"]!!.jsonPrimitive.int
        assertEquals(5, total)
    }

    @Test
    fun `list salons filters by district`() = testApp {
        val r = client.get("/api/salons?district=Mokotów")
        assertEquals(HttpStatusCode.OK, r.status)

        val body  = r.json()
        val total = body["total"]!!.jsonPrimitive.int
        val data  = body["data"]!!.jsonArray

        assertEquals(2, total)
        data.forEach { salon ->
            assertEquals("Mokotów", salon.jsonObject["district"]!!.jsonPrimitive.content)
        }
    }

    @Test
    fun `list salons filters by service`() = testApp {
        val r = client.get("/api/salons?service=barber")
        assertEquals(HttpStatusCode.OK, r.status)

        val body  = r.json()
        val total = body["total"]!!.jsonPrimitive.int
        assertEquals(1, total)

        val name = body["data"]!!.jsonArray[0].jsonObject["name"]!!.jsonPrimitive.content
        assertEquals("Barber Kings", name)
    }

    @Test
    fun `list salons respects pageSize param`() = testApp {
        val r = client.get("/api/salons?pageSize=2")
        assertEquals(HttpStatusCode.OK, r.status)

        val body = r.json()
        val data = body["data"]!!.jsonArray
        assertEquals(2, data.size)

        // Total should still reflect all records
        val total = body["total"]!!.jsonPrimitive.int
        assertEquals(5, total)
    }

    @Test
    fun `list salons returns empty data for unknown district`() = testApp {
        val r = client.get("/api/salons?district=Atlantyda")
        assertEquals(HttpStatusCode.OK, r.status)

        val total = r.json()["total"]!!.jsonPrimitive.int
        assertEquals(0, total)
    }

    // ── GET /api/salons/districts ─────────────────────────────────────────────

    @Test
    fun `districts endpoint returns sorted unique district list`() = testApp {
        val r = client.get("/api/salons/districts")
        assertEquals(HttpStatusCode.OK, r.status)

        val districts = r.jsonArray().map { it.jsonPrimitive.content }
        assertEquals(3, districts.size)                      // Mokotów, Praga-Północ, Śródmieście
        assertEquals(districts.sorted(), districts)           // must be sorted
        assertFalse(districts.contains("test"))               // source col not leaking
    }

    // ── GET /api/salons/{id} ──────────────────────────────────────────────────

    @Test
    fun `get salon by id returns full detail`() = testApp {
        val r = client.get("/api/salons/1")
        assertEquals(HttpStatusCode.OK, r.status)

        val body = r.json()
        // Detail response has more fields than summary
        assertTrue(body.containsKey("phone"))
        assertTrue(body.containsKey("website"))
        assertTrue(body.containsKey("latitude"))
        assertTrue(body.containsKey("longitude"))
        assertTrue(body.containsKey("createdAt"))
        assertTrue(body.containsKey("updatedAt"))
        assertEquals("Salon Venus", body["name"]!!.jsonPrimitive.content)
    }

    @Test
    fun `get salon returns 404 for unknown id`() = testApp {
        val r = client.get("/api/salons/999999")
        assertEquals(HttpStatusCode.NotFound, r.status)

        val body = r.json()
        assertEquals("NOT_FOUND", body["error"]!!.jsonPrimitive.content)
    }

    @Test
    fun `get salon returns 400 for non-integer id`() = testApp {
        val r = client.get("/api/salons/not-a-number")
        assertEquals(HttpStatusCode.BadRequest, r.status)

        val body = r.json()
        assertEquals("BAD_REQUEST", body["error"]!!.jsonPrimitive.content)
    }

    // ── PATCH /api/salons/{id} ────────────────────────────────────────────────

    @Test
    fun `patch salon updates only supplied fields`() = testApp {
        // First confirm original phone is null
        val before = client.get("/api/salons/1").json()
        assertNull(before["phone"]!!.jsonPrimitive.contentOrNull)

        // Patch just the phone
        val r = client.patch("/api/salons/1") {
            contentType(ContentType.Application.Json)
            setBody("""{"phone": "+48 600 123 456"}""")
        }
        assertEquals(HttpStatusCode.OK, r.status)

        val after = r.json()
        assertEquals("+48 600 123 456", after["phone"]!!.jsonPrimitive.content)
        // Name must be unchanged
        assertEquals("Salon Venus", after["name"]!!.jsonPrimitive.content)
    }

    @Test
    fun `patch salon returns 404 for unknown id`() = testApp {
        val r = client.patch("/api/salons/999999") {
            contentType(ContentType.Application.Json)
            setBody("""{"phone": "+48 600 000 000"}""")
        }
        assertEquals(HttpStatusCode.NotFound, r.status)
    }

    @Test
    fun `patch salon returns 400 for malformed body`() = testApp {
        val r = client.patch("/api/salons/1") {
            contentType(ContentType.Application.Json)
            setBody("this is not json {{{")
        }
        assertEquals(HttpStatusCode.BadRequest, r.status)
    }
}
