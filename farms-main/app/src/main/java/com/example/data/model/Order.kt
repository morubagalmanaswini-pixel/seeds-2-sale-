package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "direct_orders")
data class Order(
  @PrimaryKey(autoGenerate = true)
  val id: Long = 0,
  val produceId: Long,
  val produceName: String,
  val category: String,
  val farmerName: String,
  val farmerPhone: String,
  val quantity: Double,
  val unit: String,
  val unitPrice: Double,
  val totalPrice: Double,
  val middlemanEquivalentPrice: Double,
  val totalSavings: Double,
  val buyerName: String,
  val buyerPhone: String,
  val deliveryAddress: String,
  val paymentMethod: String = "Direct Pay on Delivery",
  val status: String = "Order Placed", // Order Placed, Confirmed by Farmer, Ready for Pickup, Delivered
  val timestamp: Long = System.currentTimeMillis()
)
