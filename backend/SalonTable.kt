package com.sumup.salon.repository

import org.jetbrains.exposed.sql.Table

/**
 * Exposed table object that mirrors the SQLite schema created by db.py.
 * Column names must match exactly so we can point Ktor at the
 * same salons.db file the Python scraper produced.
 */
object SalonTable : Table("salons") {
    val id          = integer("id").autoIncrement()
    val name        = text("name")
    val address     = text("address")
    val district    = text("district")
    val phone       = text("phone").nullable()
    val website     = text("website").nullable()
    val services    = text("services").nullable()
    val priceRange  = text("price_range").nullable()
    val rating      = double("rating").nullable()
    val reviewCount = integer("review_count").nullable()
    val source      = text("source")
    val sourceId    = text("source_id").nullable()
    val sourceUrl   = text("source_url").nullable()
    val latitude    = double("latitude").nullable()
    val longitude   = double("longitude").nullable()
    val createdAt   = text("created_at")
    val updatedAt   = text("updated_at")

    override val primaryKey = PrimaryKey(id)
}
