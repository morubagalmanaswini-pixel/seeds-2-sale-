package com.example.data.repository

import com.example.data.dao.OrderDao
import com.example.data.dao.ProduceDao
import com.example.data.model.Order
import com.example.data.model.ProduceItem
import kotlinx.coroutines.flow.Flow

class FarmRepository(
  private val produceDao: ProduceDao,
  private val orderDao: OrderDao
) {
  val allProduce: Flow<List<ProduceItem>> = produceDao.getAllProduce()

  val allOrders: Flow<List<Order>> = orderDao.getAllOrders()

  fun getProduceByCategory(category: String): Flow<List<ProduceItem>> {
    return produceDao.getProduceByCategory(category)
  }

  fun getProduceByFarmer(farmerPhone: String): Flow<List<ProduceItem>> {
    return produceDao.getProduceByFarmer(farmerPhone)
  }

  fun getOrdersForFarmer(farmerPhone: String): Flow<List<Order>> {
    return orderDao.getOrdersForFarmer(farmerPhone)
  }

  suspend fun insertProduce(item: ProduceItem): Long {
    return produceDao.insertProduce(item)
  }

  suspend fun updateProduce(item: ProduceItem) {
    produceDao.updateProduce(item)
  }

  suspend fun deleteProduce(id: Long) {
    produceDao.deleteProduceById(id)
  }

  suspend fun placeOrder(order: Order): Long {
    return orderDao.insertOrder(order)
  }

  suspend fun updateOrderStatus(orderId: Long, status: String) {
    orderDao.updateOrderStatus(orderId, status)
  }

  suspend fun deleteOrder(orderId: Long) {
    orderDao.deleteOrderById(orderId)
  }

  suspend fun checkAndSeedInitialData() {
    if (produceDao.getCount() == 0) {
      com.example.data.AppDatabase.populateInitialProduce(produceDao)
    }
  }
}
