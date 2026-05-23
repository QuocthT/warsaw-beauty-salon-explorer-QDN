package com.sumup.salon.repository

import com.sumup.salon.models.SalonDetail
import com.sumup.salon.models.SalonSummary
import com.sumup.salon.models.SalonUpdateRequest
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction

class SalonRepository {

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    /**
     * Returns a paginated list of salon summaries.
     *
     * @param district  filter by exact district name (case-insensitive), or null for all
     * @param service   filter by substring match in the services field, or null for all
     * @param page      1-based page number
     * @param pageSize  records per page (max 2000)
     */
    fun listSalons(
        district: String?,
        service: String?,
        search: String?,
        source: String?,
        sortBy: String?,
        page: Int,
        pageSize: Int,
        minRating: Double? = null,
        minReviews: Int? = null,
    ): Pair<List<SalonSummary>, Int> = transaction {
        val query = buildBaseQuery(district, service, search, source, minRating, minReviews)

        val total = query.count().toInt()

        // "reviews" (default) → most-reviewed first so first-page looks credible.
        // "rating"            → highest-rated first.
        // "name"              → alphabetical A–Z.
        val order: Pair<Column<*>, SortOrder> = when (sortBy) {
            "rating" -> SalonTable.rating      to SortOrder.DESC_NULLS_LAST
            "name"   -> SalonTable.name        to SortOrder.ASC
            else     -> SalonTable.reviewCount to SortOrder.DESC_NULLS_LAST
        }

        val offset = ((page - 1) * pageSize).toLong()
        val rows = query
            .orderBy(order)
            .limit(pageSize, offset)
            .toList()

        val summaries = rows.map { it.toSummary() }
        Pair(summaries, total)
    }

    /**
     * Returns full details for a single salon, or null if not found.
     */
    fun getSalon(id: Int): SalonDetail? = transaction {
        SalonTable
            .select { SalonTable.id eq id }
            .singleOrNull()
            ?.toDetail()
    }

    /**
     * Returns all distinct district names, sorted alphabetically.
     * Used by the frontend to populate the district filter dropdown.
     */
    fun listDistricts(): List<String> = transaction {
        SalonTable
            .slice(SalonTable.district)
            .selectAll()
            .withDistinct()
            .map { it[SalonTable.district] }
            .sorted()
    }

    /**
     * Returns the top-20 service tokens by frequency.
     *
     * Each row's `services` column is a comma-separated string
     * (e.g. "Fryzjer, Barber"). This method splits on "," , trims
     * whitespace, deduplicates across all rows, and returns the tokens
     * sorted by how many salons offer them — most common first.
     *
     * Used by the frontend to populate the service chip row.
     */
    fun listServices(): List<String> = transaction {
        exec(
            "SELECT services FROM salons WHERE services IS NOT NULL AND services != ''"
        ) { rs ->
            val tokens = mutableListOf<String>()
            while (rs.next()) {
                rs.getString(1)
                    .split(",")
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }
                    .forEach { tokens.add(it) }
            }
            tokens
                .groupingBy { it }
                .eachCount()
                .entries
                .sortedByDescending { it.value }
                .take(20)
                .map { it.key }
        } ?: emptyList()
    }

    // -------------------------------------------------------------------------
    // Mutations
    // -------------------------------------------------------------------------

    /**
     * Applies a partial update to a salon. Only non-null fields in the request
     * are written — nulls are treated as "no change", not "clear this field".
     *
     * Returns the updated salon, or null if the id doesn't exist.
     */
    fun updateSalon(id: Int, req: SalonUpdateRequest): SalonDetail? = transaction {
        val exists = SalonTable
            .select { SalonTable.id eq id }
            .count() > 0

        if (!exists) return@transaction null

        SalonTable.update({ SalonTable.id eq id }) { stmt ->
            req.name?.let         { stmt[SalonTable.name]        = it }
            req.address?.let      { stmt[SalonTable.address]     = it }
            req.district?.let     { stmt[SalonTable.district]    = it }
            req.phone?.let        { stmt[SalonTable.phone]       = it }
            req.website?.let      { stmt[SalonTable.website]     = it }
            req.services?.let     { stmt[SalonTable.services]    = it }
            req.priceRange?.let   { stmt[SalonTable.priceRange]  = it }
            req.rating?.let       { stmt[SalonTable.rating]      = it }
            req.reviewCount?.let  { stmt[SalonTable.reviewCount] = it }
            stmt[SalonTable.updatedAt] = java.time.LocalDateTime.now().toString()
        }

        // Return the fresh record after update
        SalonTable
            .select { SalonTable.id eq id }
            .single()
            .toDetail()
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private fun buildBaseQuery(
        district: String?,
        service: String?,
        search: String?,
        source: String?,
        minRating: Double? = null,
        minReviews: Int? = null,
    ): Query {
        var query: Query = SalonTable.selectAll()

        district?.let {
            query = query.andWhere {
                SalonTable.district.lowerCase() eq it.lowercase()
            }
        }

        // Chip-selected service: match services column OR name, so salons whose
        // type was inferred from their name (e.g. "FF Barber shop") are found
        // even when their services column is empty.
        service?.let {
            val term = "%${it.lowercase()}%"
            query = query.andWhere {
                (SalonTable.services.lowerCase() like term) or
                (SalonTable.name.lowerCase() like term)
            }
        }

        // Free-text search: match name OR services (broader, user-typed query).
        search?.let {
            val term = "%${it.lowercase()}%"
            query = query.andWhere {
                (SalonTable.name.lowerCase() like term) or
                (SalonTable.services.lowerCase() like term)
            }
        }

        // Exact source filter (e.g. "booksy", "google", "osm", "manual").
        source?.let {
            query = query.andWhere { SalonTable.dataSource eq it }
        }

        // Minimum rating filter — excludes NULLs and anything below the threshold.
        minRating?.let { min ->
            query = query.andWhere { SalonTable.rating greaterEq min }
        }

        // Minimum review count — filters out statistically unreliable ratings
        // (e.g. a single 5-star review inflating the score).
        minReviews?.let { min ->
            query = query.andWhere { SalonTable.reviewCount greaterEq min }
        }

        return query
    }

    private fun ResultRow.toSummary() = SalonSummary(
        id          = this[SalonTable.id],
        name        = this[SalonTable.name],
        address     = this[SalonTable.address],
        district    = this[SalonTable.district],
        rating      = this[SalonTable.rating],
        reviewCount = this[SalonTable.reviewCount],
        priceRange  = this[SalonTable.priceRange],
        services    = this[SalonTable.services],
        source      = this[SalonTable.dataSource],
        latitude    = this[SalonTable.latitude],
        longitude   = this[SalonTable.longitude],
    )

    private fun ResultRow.toDetail() = SalonDetail(
        id          = this[SalonTable.id],
        name        = this[SalonTable.name],
        address     = this[SalonTable.address],
        district    = this[SalonTable.district],
        phone       = this[SalonTable.phone],
        website     = this[SalonTable.website],
        services    = this[SalonTable.services],
        priceRange  = this[SalonTable.priceRange],
        rating      = this[SalonTable.rating],
        reviewCount = this[SalonTable.reviewCount],
        source      = this[SalonTable.dataSource],
        sourceUrl   = this[SalonTable.sourceUrl],
        latitude    = this[SalonTable.latitude],
        longitude   = this[SalonTable.longitude],
        createdAt   = this[SalonTable.createdAt],
        updatedAt   = this[SalonTable.updatedAt],
    )
}
