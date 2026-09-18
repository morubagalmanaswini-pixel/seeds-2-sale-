package com.example.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.ProduceItem
import kotlinx.coroutines.flow.Flow

@Dao
interface ProduceDao {
  @Query("SELECT * FROM produce_items ORDER BY timestamp DESC")
  fun getAllProduce(): Flow<List<ProduceItem>>

  @Query("SELECT * FROM produce_items WHERE category = :category ORDER BY timestamp DESC")
  fun getProduceByCategory(category: String): Flow<List<ProduceItem>>

  @Query("SELECT * FROM produce_items WHERE id = :id")
  suspend fun getProduceById(id: Long): ProduceItem?

  @Query("SELECT * FROM produce_items WHERE farmerPhone = :farmerPhone ORDER BY timestamp DESC")
  fun getProduceByFarmer(farmerPhone: String): Flow<List<ProduceItem>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertProduce(item: ProduceItem): Long

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAll(items: List<ProduceItem>)

  @Update
  suspend fun updateProduce(item: ProduceItem)

  @Query("DELETE FROM produce_items WHERE id = :id")
  suspend fun deleteProduceById(id: Long)

  @Query("SELECT COUNT(*) FROM produce_items")
  suspend fun getCount(): Int
}
