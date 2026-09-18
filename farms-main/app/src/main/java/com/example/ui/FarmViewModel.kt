package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.AppDatabase
import com.example.data.model.Order
import com.example.data.model.ProduceItem
import com.example.data.repository.FarmRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class UserRole {
  CONSUMER,
  FARMER
}

enum class NavigationTab {
  MARKETPLACE,
  ELIMINATOR_CALC,
  ORDERS,
  FARMER_PORTAL
}

class FarmViewModel(application: Application) : AndroidViewModel(application) {
  private val repository: FarmRepository

  private val _userRole = MutableStateFlow(UserRole.CONSUMER)
  val userRole: StateFlow<UserRole> = _userRole.asStateFlow()

  private val _currentTab = MutableStateFlow(NavigationTab.MARKETPLACE)
  val currentTab: StateFlow<NavigationTab> = _currentTab.asStateFlow()

  private val _selectedCategory = MutableStateFlow("All")
  val selectedCategory: StateFlow<String> = _selectedCategory.asStateFlow()

  private val _searchQuery = MutableStateFlow("")
  val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

  // For Farmer Mode: currently active farmer profile phone for filtering farmer's own stock
  private val _activeFarmerPhone = MutableStateFlow("+91 98765 43210")
  val activeFarmerPhone: StateFlow<String> = _activeFarmerPhone.asStateFlow()

  val rawProduceList: StateFlow<List<ProduceItem>>
  val ordersList: StateFlow<List<Order>>

  // Filtered produce according to search and category
  val filteredProduce: StateFlow<List<ProduceItem>>

  init {
    val db = AppDatabase.getDatabase(application, viewModelScope)
    repository = FarmRepository(db.produceDao(), db.orderDao())

    rawProduceList = repository.allProduce.stateIn(
      scope = viewModelScope,
      started = SharingStarted.WhileSubscribed(5000),
      initialValue = emptyList()
    )

    ordersList = repository.allOrders.stateIn(
      scope = viewModelScope,
      started = SharingStarted.WhileSubscribed(5000),
      initialValue = emptyList()
    )

    filteredProduce = combine(
      rawProduceList,
      _selectedCategory,
      _searchQuery
    ) { list, category, query ->
      list.filter { item ->
        val matchesCategory = if (category == "All") true else item.category.equals(category, ignoreCase = true)
        val matchesQuery = if (query.isBlank()) true else {
          item.name.contains(query, ignoreCase = true) ||
            item.farmerName.contains(query, ignoreCase = true) ||
            item.location.contains(query, ignoreCase = true) ||
            item.category.contains(query, ignoreCase = true)
        }
        matchesCategory && matchesQuery
      }
    }.stateIn(
      scope = viewModelScope,
      started = SharingStarted.WhileSubscribed(5000),
      initialValue = emptyList()
    )

    // Ensure initial seed produce is inserted if database is freshly built
    viewModelScope.launch(Dispatchers.IO) {
      repository.checkAndSeedInitialData()
    }
  }

  fun setUserRole(role: UserRole) {
    _userRole.value = role
    if (role == UserRole.FARMER) {
      _currentTab.value = NavigationTab.FARMER_PORTAL
    } else {
      if (_currentTab.value == NavigationTab.FARMER_PORTAL) {
        _currentTab.value = NavigationTab.MARKETPLACE
      }
    }
  }

  fun setTab(tab: NavigationTab) {
    _currentTab.value = tab
  }

  fun setCategory(category: String) {
    _selectedCategory.value = category
  }

  fun setSearchQuery(query: String) {
    _searchQuery.value = query
  }

  fun setActiveFarmerPhone(phone: String) {
    _activeFarmerPhone.value = phone
  }

  fun addProduceItem(
    name: String,
    category: String,
    farmPrice: Double,
    middlemanPrice: Double,
    unit: String,
    quantityAvailable: Double,
    farmerName: String,
    farmName: String,
    farmerPhone: String,
    location: String,
    isOrganic: Boolean,
    harvestDate: String,
    description: String
  ) {
    viewModelScope.launch(Dispatchers.IO) {
      val item = ProduceItem(
        name = name,
        category = category,
        farmPrice = farmPrice,
        middlemanPrice = middlemanPrice,
        unit = unit,
        quantityAvailable = quantityAvailable,
        farmerName = farmerName,
        farmName = farmName,
        farmerPhone = farmerPhone,
        location = location,
        isOrganic = isOrganic,
        harvestDate = harvestDate,
        description = description
      )
      repository.insertProduce(item)
    }
  }

  fun deleteProduceItem(id: Long) {
    viewModelScope.launch(Dispatchers.IO) {
      repository.deleteProduce(id)
    }
  }

  fun placeDirectOrder(
    produce: ProduceItem,
    quantity: Double,
    buyerName: String,
    buyerPhone: String,
    deliveryAddress: String,
    onSuccess: () -> Unit
  ) {
    viewModelScope.launch(Dispatchers.IO) {
      val totalPrice = produce.farmPrice * quantity
      val middlemanEquivalent = produce.middlemanPrice * quantity
      val savings = (middlemanEquivalent - totalPrice).coerceAtLeast(0.0)

      val order = Order(
        produceId = produce.id,
        produceName = produce.name,
        category = produce.category,
        farmerName = produce.farmerName,
        farmerPhone = produce.farmerPhone,
        quantity = quantity,
        unit = produce.unit,
        unitPrice = produce.farmPrice,
        totalPrice = totalPrice,
        middlemanEquivalentPrice = middlemanEquivalent,
        totalSavings = savings,
        buyerName = buyerName,
        buyerPhone = buyerPhone,
        deliveryAddress = deliveryAddress
      )
      repository.placeOrder(order)

      // Deduct quantity from produce
      val updatedStock = (produce.quantityAvailable - quantity).coerceAtLeast(0.0)
      repository.updateProduce(produce.copy(quantityAvailable = updatedStock))

      launch(Dispatchers.Main) {
        onSuccess()
      }
    }
  }

  fun updateOrderStatus(orderId: Long, newStatus: String) {
    viewModelScope.launch(Dispatchers.IO) {
      repository.updateOrderStatus(orderId, newStatus)
    }
  }

  fun deleteOrder(orderId: Long) {
    viewModelScope.launch(Dispatchers.IO) {
      repository.deleteOrder(orderId)
    }
  }
}
