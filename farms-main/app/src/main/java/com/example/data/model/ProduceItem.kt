package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "produce_items")
data class ProduceItem(
  @PrimaryKey(autoGenerate = true)
  val id: Long = 0,
  val name: String,
  val category: String, // Vegetables, Fruits, Grains, Pulses, Dairy, Spices, Honey
  val farmPrice: Double, // Fair price directly to farmer
  val middlemanPrice: Double, // What consumers usually pay through brokers/retailers
  val unit: String, // kg, bunch, crate, litre, dozen, pack
  val quantityAvailable: Double,
  val farmerName: String,
  val farmName: String,
  val farmerPhone: String,
  val location: String,
  val isOrganic: Boolean = true,
  val harvestDate: String,
  val description: String,
  val timestamp: Long = System.currentTimeMillis()
) {
  // Direct calculations showing middleman elimination benefits
  val savingsPerUnit: Double
    get() = (middlemanPrice - farmPrice).coerceAtLeast(0.0)

  val savingsPercentage: Int
    get() = if (middlemanPrice > 0) {
      (((middlemanPrice - farmPrice) / middlemanPrice) * 100).toInt().coerceIn(0, 99)
    } else 0
}
