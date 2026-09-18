package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Agriculture
import androidx.compose.material.icons.filled.Calculate
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.data.model.ProduceItem
import com.example.ui.FarmViewModel
import com.example.ui.NavigationTab
import com.example.ui.UserRole
import com.example.ui.components.AddProduceDialog
import com.example.ui.components.DirectOrderDialog
import com.example.ui.components.TopHeader
import com.example.ui.screens.FarmerDashboardScreen
import com.example.ui.screens.MarketplaceScreen
import com.example.ui.screens.MiddlemanEliminatorScreen
import com.example.ui.screens.OrdersScreen
import com.example.ui.theme.DarkGreenContainer
import com.example.ui.theme.DarkGreenDark
import com.example.ui.theme.DarkGreenPrimary
import com.example.ui.theme.EarthBrownDark
import com.example.ui.theme.EarthBrownSecondary
import com.example.ui.theme.HarvestRedTertiary
import com.example.ui.theme.MyApplicationTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        FarmDirectApp()
      }
    }
  }
}

@Composable
fun FarmDirectApp(
  viewModel: FarmViewModel = viewModel()
) {
  val userRole by viewModel.userRole.collectAsStateWithLifecycle()
  val currentTab by viewModel.currentTab.collectAsStateWithLifecycle()
  val filteredProduce by viewModel.filteredProduce.collectAsStateWithLifecycle()
  val allProduce by viewModel.rawProduceList.collectAsStateWithLifecycle()
  val ordersList by viewModel.ordersList.collectAsStateWithLifecycle()
  val selectedCategory by viewModel.selectedCategory.collectAsStateWithLifecycle()
  val searchQuery by viewModel.searchQuery.collectAsStateWithLifecycle()

  var orderingProduce by remember { mutableStateOf<ProduceItem?>(null) }
  var showAddProduceDialog by remember { mutableStateOf(false) }

  val snackbarHostState = remember { SnackbarHostState() }
  val scope = rememberCoroutineScope()

  Scaffold(
    snackbarHost = { SnackbarHost(snackbarHostState) },
    topBar = {
      TopHeader(
        userRole = userRole,
        onRoleChange = { role -> viewModel.setUserRole(role) }
      )
    },
    bottomBar = {
      NavigationBar(
        containerColor = Color.White,
        tonalElevation = 8.dp,
        modifier = Modifier.navigationBarsPadding().testTag("bottom_navigation_bar")
      ) {
        // Tab 1: Marketplace
        NavigationBarItem(
          selected = currentTab == NavigationTab.MARKETPLACE,
          onClick = { viewModel.setTab(NavigationTab.MARKETPLACE) },
          icon = {
            Icon(
              imageVector = Icons.Default.Storefront,
              contentDescription = "Marketplace",
              modifier = Modifier.size(22.dp)
            )
          },
          label = {
            Text(
              text = "Market",
              fontSize = 11.sp,
              fontWeight = if (currentTab == NavigationTab.MARKETPLACE) FontWeight.Bold else FontWeight.Normal
            )
          },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = DarkGreenPrimary,
            selectedTextColor = DarkGreenPrimary,
            indicatorColor = DarkGreenContainer,
            unselectedIconColor = EarthBrownSecondary,
            unselectedTextColor = EarthBrownDark
          ),
          modifier = Modifier.testTag("nav_tab_marketplace")
        )

        // Tab 2: Zero Middlemen / Fair Trade Simulator
        NavigationBarItem(
          selected = currentTab == NavigationTab.ELIMINATOR_CALC,
          onClick = { viewModel.setTab(NavigationTab.ELIMINATOR_CALC) },
          icon = {
            Icon(
              imageVector = Icons.Default.TrendingDown,
              contentDescription = "Zero Middlemen",
              modifier = Modifier.size(22.dp)
            )
          },
          label = {
            Text(
              text = "Zero Cut",
              fontSize = 11.sp,
              fontWeight = if (currentTab == NavigationTab.ELIMINATOR_CALC) FontWeight.Bold else FontWeight.Normal
            )
          },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = HarvestRedTertiary,
            selectedTextColor = HarvestRedTertiary,
            indicatorColor = Color(0xFFFFEBEE),
            unselectedIconColor = EarthBrownSecondary,
            unselectedTextColor = EarthBrownDark
          ),
          modifier = Modifier.testTag("nav_tab_eliminator")
        )

        // Tab 3: Direct Orders
        NavigationBarItem(
          selected = currentTab == NavigationTab.ORDERS,
          onClick = { viewModel.setTab(NavigationTab.ORDERS) },
          icon = {
            BadgedBox(
              badge = {
                if (ordersList.isNotEmpty()) {
                  Badge(containerColor = HarvestRedTertiary) {
                    Text(
                      text = "${ordersList.size}",
                      color = Color.White,
                      fontSize = 10.sp
                    )
                  }
                }
              }
            ) {
              Icon(
                imageVector = Icons.Default.LocalShipping,
                contentDescription = "Direct Orders",
                modifier = Modifier.size(22.dp)
              )
            }
          },
          label = {
            Text(
              text = "Orders",
              fontSize = 11.sp,
              fontWeight = if (currentTab == NavigationTab.ORDERS) FontWeight.Bold else FontWeight.Normal
            )
          },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = DarkGreenPrimary,
            selectedTextColor = DarkGreenPrimary,
            indicatorColor = DarkGreenContainer,
            unselectedIconColor = EarthBrownSecondary,
            unselectedTextColor = EarthBrownDark
          ),
          modifier = Modifier.testTag("nav_tab_orders")
        )

        // Tab 4: Farmer Hub
        NavigationBarItem(
          selected = currentTab == NavigationTab.FARMER_PORTAL,
          onClick = {
            viewModel.setUserRole(UserRole.FARMER)
            viewModel.setTab(NavigationTab.FARMER_PORTAL)
          },
          icon = {
            Icon(
              imageVector = Icons.Default.Agriculture,
              contentDescription = "Farmer Portal",
              modifier = Modifier.size(22.dp)
            )
          },
          label = {
            Text(
              text = "Farmer Hub",
              fontSize = 11.sp,
              fontWeight = if (currentTab == NavigationTab.FARMER_PORTAL) FontWeight.Bold else FontWeight.Normal
            )
          },
          colors = NavigationBarItemDefaults.colors(
            selectedIconColor = EarthBrownDark,
            selectedTextColor = EarthBrownDark,
            indicatorColor = Color(0xFFD7CCC8),
            unselectedIconColor = EarthBrownSecondary,
            unselectedTextColor = EarthBrownDark
          ),
          modifier = Modifier.testTag("nav_tab_farmer")
        )
      }
    },
    modifier = Modifier.fillMaxSize()
  ) { innerPadding ->
    Box(
      modifier = Modifier
        .fillMaxSize()
        .padding(innerPadding)
    ) {
      when (currentTab) {
        NavigationTab.MARKETPLACE -> {
          MarketplaceScreen(
            produceList = filteredProduce,
            selectedCategory = selectedCategory,
            searchQuery = searchQuery,
            onCategorySelected = { viewModel.setCategory(it) },
            onSearchQueryChanged = { viewModel.setSearchQuery(it) },
            onBuyProduceClick = { produce -> orderingProduce = produce }
          )
        }

        NavigationTab.ELIMINATOR_CALC -> {
          MiddlemanEliminatorScreen()
        }

        NavigationTab.ORDERS -> {
          OrdersScreen(
            orders = ordersList,
            onDeleteOrder = { orderId ->
              viewModel.deleteOrder(orderId)
              scope.launch {
                snackbarHostState.showSnackbar("Direct order cancelled")
              }
            }
          )
        }

        NavigationTab.FARMER_PORTAL -> {
          FarmerDashboardScreen(
            produceList = allProduce,
            ordersList = ordersList,
            onAddProduceClick = { showAddProduceDialog = true },
            onDeleteProduce = { id ->
              viewModel.deleteProduceItem(id)
              scope.launch {
                snackbarHostState.showSnackbar("Produce listing removed")
              }
            },
            onUpdateOrderStatus = { id, status ->
              viewModel.updateOrderStatus(id, status)
              scope.launch {
                snackbarHostState.showSnackbar("Order status updated to $status")
              }
            }
          )
        }
      }
    }
  }

  // Direct Order Dialog
  orderingProduce?.let { produce ->
    DirectOrderDialog(
      produce = produce,
      onDismiss = { orderingProduce = null },
      onConfirmOrder = { qty, name, phone, address ->
        viewModel.placeDirectOrder(
          produce = produce,
          quantity = qty,
          buyerName = name,
          buyerPhone = phone,
          deliveryAddress = address,
          onSuccess = {
            orderingProduce = null
            scope.launch {
              snackbarHostState.showSnackbar(
                "Direct order placed with ${produce.farmerName}! You saved money from middlemen."
              )
            }
          }
        )
      }
    )
  }

  // Farmer Add Produce Dialog
  if (showAddProduceDialog) {
    AddProduceDialog(
      onDismiss = { showAddProduceDialog = false },
      onAddProduce = { name, category, fp, mp, unit, qty, farmer, farm, phone, loc, org, harvest, desc ->
        viewModel.addProduceItem(
          name = name,
          category = category,
          farmPrice = fp,
          middlemanPrice = mp,
          unit = unit,
          quantityAvailable = qty,
          farmerName = farmer,
          farmName = farm,
          farmerPhone = phone,
          location = loc,
          isOrganic = org,
          harvestDate = harvest,
          description = desc
        )
        showAddProduceDialog = false
        scope.launch {
          snackbarHostState.showSnackbar("Crop listed directly! Visible to all consumers.")
        }
      }
    )
  }
}
