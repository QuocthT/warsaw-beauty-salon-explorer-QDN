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
     * @param pageSize  records per page (max 100)
     */
    fun listSalons(
        district: String?,
        service: String?,
        page: Int,
        pageSize: Int,
    ): Pair<List<SalonSummary>, Int> = transaction {
        val query = buildBaseQuery(district, service)

        val total = query.count().toInt()

        val offset = ((page - 1) * pageSize).toLong()
        val rows = query
            .orderBy(SalonTable.rating to SortOrder.DESC_NULLS_LAST)
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

    private fun buildBaseQuery(district: String?, service: String?): Query {
        var query: Query = SalonTable.selectAll()

        district?.let {
            query = query.andWhere {
                SalonTable.district.lowerCase() eq it.lowercase()
            }
        }

        service?.let {
            query = query.andWhere {
                SalonTable.services.lowerCase() like "%${it.lowercase()}%"
            }
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
