package com.example.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.Order
import kotlinx.coroutines.flow.Flow

@Dao
interface OrderDao {
  @Query("SELECT * FROM direct_orders ORDER BY timestamp DESC")
  fun getAllOrders(): Flow<List<Order>>

  @Query("SELECT * FROM direct_orders WHERE farmerPhone = :farmerPhone ORDER BY timestamp DESC")
  fun getOrdersForFarmer(farmerPhone: String): Flow<List<Order>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertOrder(order: Order): Long

  @Update
  suspend fun updateOrder(order: Order)

  @Query("UPDATE direct_orders SET status = :newStatus WHERE id = :orderId")
  suspend fun updateOrderStatus(orderId: Long, newStatus: String)

  @Query("DELETE FROM direct_orders WHERE id = :id")
  suspend fun deleteOrderById(id: Long)
}
