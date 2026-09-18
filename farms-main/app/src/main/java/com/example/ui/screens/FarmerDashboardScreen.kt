package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Agriculture
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.Order
import com.example.data.model.ProduceItem
import com.example.ui.theme.DarkGreenContainer
import com.example.ui.theme.DarkGreenDark
import com.example.ui.theme.DarkGreenPrimary
import androidx.compose.foundation.layout.BoxWithConstraints
import com.example.ui.theme.EarthBrownBorder
import com.example.ui.theme.EarthBrownContainer
import com.example.ui.theme.EarthBrownDark
import com.example.ui.theme.EarthBrownDeep
import com.example.ui.theme.EarthBrownSand
import com.example.ui.theme.EarthBrownSecondary
import com.example.ui.theme.EarthBrownWarm
import com.example.ui.theme.HarvestRedTertiary

@Composable
fun FarmerDashboardScreen(
  produceList: List<ProduceItem>,
  ordersList: List<Order>,
  onAddProduceClick: () -> Unit,
  onDeleteProduce: (Long) -> Unit,
  onUpdateOrderStatus: (Long, String) -> Unit,
  modifier: Modifier = Modifier
) {
  val context = LocalContext.current
  val totalStockUnits = produceList.sumOf { it.quantityAvailable }
  val totalDirectRevenue = ordersList.sumOf { it.totalPrice }

  Scaffold(
    floatingActionButton = {
      ExtendedFloatingActionButton(
        onClick = onAddProduceClick,
        containerColor = HarvestRedTertiary,
        contentColor = Color.White,
        icon = { Icon(Icons.Default.Add, contentDescription = "Add Produce") },
        text = { Text("List Harvest", fontWeight = FontWeight.Bold) },
        modifier = Modifier.testTag("fab_add_produce")
      )
    },
    modifier = modifier.fillMaxSize()
  ) { innerPadding ->
    BoxWithConstraints(
      modifier = Modifier
        .fillMaxSize()
        .background(Color(0xFFF7F8F4))
        .padding(innerPadding)
        .padding(16.dp)
        .testTag("farmer_dashboard_screen")
    ) {
      val isWideScreen = maxWidth >= 750.dp

      if (isWideScreen) {
        // Laptop / Desktop 2-pane layout
        Column(
          modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
          verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
          FarmerSummaryHeroCard(
            totalDirectRevenue = totalDirectRevenue,
            produceCount = produceList.size,
            totalStockUnits = totalStockUnits
          )

          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
          ) {
            // Left Pane: Incoming Consumer Orders
            Column(
              modifier = Modifier.weight(1f),
              verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
              Text(
                text = "Incoming Orders (${ordersList.size})",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = DarkGreenDark
              )

              if (ordersList.isEmpty()) {
                Card(
                  shape = RoundedCornerShape(12.dp),
                  colors = CardDefaults.cardColors(containerColor = Color.White),
                  border = BorderStroke(1.dp, EarthBrownBorder),
                  modifier = Modifier.fillMaxWidth()
                ) {
                  Box(
                    modifier = Modifier
                      .fillMaxWidth()
                      .padding(24.dp),
                    contentAlignment = Alignment.Center
                  ) {
                    Text(
                      text = "No customer orders yet. Fresh orders will show up here directly!",
                      color = EarthBrownWarm,
                      fontSize = 13.sp
                    )
                  }
                }
              } else {
                ordersList.forEach { order ->
                  FarmerIncomingOrderCard(
                    order = order,
                    onCallBuyer = { phone ->
                      val intent = Intent(Intent.ACTION_DIAL).apply {
                        data = Uri.parse("tel:${phone.replace(" ", "")}")
                      }
                      context.startActivity(intent)
                    },
                    onUpdateOrderStatus = onUpdateOrderStatus
                  )
                }
              }
            }

            // Right Pane: Harvested Crops Listed
            Column(
              modifier = Modifier.weight(1f),
              verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
              Text(
                text = "Your Harvested Crops (${produceList.size})",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = DarkGreenDark
              )

              produceList.forEach { produce ->
                FarmerProduceListingCard(
                  produce = produce,
                  onDelete = { onDeleteProduce(produce.id) }
                )
              }
            }
          }
        }
      } else {
        // Mobile Single Column view
        LazyColumn(
          modifier = Modifier.fillMaxSize(),
          verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
          item {
            FarmerSummaryHeroCard(
              totalDirectRevenue = totalDirectRevenue,
              produceCount = produceList.size,
              totalStockUnits = totalStockUnits
            )
          }

          item {
            Text(
              text = "Incoming Orders (${ordersList.size})",
              fontSize = 16.sp,
              fontWeight = FontWeight.Bold,
              color = DarkGreenDark
            )
          }

          if (ordersList.isEmpty()) {
            item {
              Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = BorderStroke(1.dp, EarthBrownBorder),
                modifier = Modifier.fillMaxWidth()
              ) {
                Box(
                  modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                  contentAlignment = Alignment.Center
                ) {
                  Text(
                    text = "No customer orders yet. Fresh orders will show up here directly!",
                    color = Color.Gray,
                    fontSize = 13.sp
                  )
                }
              }
            }
          } else {
            items(ordersList, key = { "order_${it.id}" }) { order ->
              FarmerIncomingOrderCard(
                order = order,
                onCallBuyer = { phone ->
                  val intent = Intent(Intent.ACTION_DIAL).apply {
                    data = Uri.parse("tel:${phone.replace(" ", "")}")
                  }
                  context.startActivity(intent)
                },
                onUpdateOrderStatus = onUpdateOrderStatus
              )
            }
          }

          item {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
              text = "Your Harvested Crops (${produceList.size})",
              fontSize = 16.sp,
              fontWeight = FontWeight.Bold,
              color = DarkGreenDark
            )
          }

          items(produceList, key = { "produce_${it.id}" }) { produce ->
            FarmerProduceListingCard(
              produce = produce,
              onDelete = { onDeleteProduce(produce.id) }
            )
          }
        }
      }
    }
  }
}

@Composable
private fun FarmerSummaryHeroCard(
  totalDirectRevenue: Double,
  produceCount: Int,
  totalStockUnits: Double
) {
  Card(
    shape = RoundedCornerShape(16.dp),
    colors = CardDefaults.cardColors(containerColor = DarkGreenPrimary),
    border = BorderStroke(1.dp, EarthBrownBorder),
    modifier = Modifier.fillMaxWidth()
  ) {
    Column(modifier = Modifier.padding(16.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Box(
            modifier = Modifier
              .size(40.dp)
              .clip(CircleShape)
              .background(EarthBrownDark),
            contentAlignment = Alignment.Center
          ) {
            Icon(
              imageVector = Icons.Default.Agriculture,
              contentDescription = null,
              tint = Color.White,
              modifier = Modifier.size(22.dp)
            )
          }
          Spacer(modifier = Modifier.width(10.dp))
          Column {
            Text(
              text = "Farmer Selling Portal",
              color = Color.White,
              fontSize = 17.sp,
              fontWeight = FontWeight.Bold
            )
            Text(
              text = "Zero commission • 100% farm revenue",
              color = Color(0xFFD4EED8),
              fontSize = 12.sp
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
      ) {
        Surface(
          shape = RoundedCornerShape(10.dp),
          color = Color(0xFF143D21),
          modifier = Modifier.weight(1f)
        ) {
          Column(modifier = Modifier.padding(10.dp)) {
            Text(
              text = "Direct Revenue",
              fontSize = 11.sp,
              color = Color(0xFFD4EED8)
            )
            Text(
              text = "₹${totalDirectRevenue.toInt()}",
              fontSize = 18.sp,
              fontWeight = FontWeight.ExtraBold,
              color = Color.White
            )
            Text(
              text = "0% broker deduction",
              fontSize = 10.sp,
              color = Color(0xFF81C784)
            )
          }
        }

        Surface(
          shape = RoundedCornerShape(10.dp),
          color = EarthBrownDeep,
          border = BorderStroke(0.8.dp, EarthBrownWarm),
          modifier = Modifier.weight(1f)
        ) {
          Column(modifier = Modifier.padding(10.dp)) {
            Text(
              text = "Active Listings",
              fontSize = 11.sp,
              color = EarthBrownSand
            )
            Text(
              text = "$produceCount crops",
              fontSize = 18.sp,
              fontWeight = FontWeight.Bold,
              color = Color.White
            )
            Text(
              text = "${totalStockUnits.toInt()} units in stock",
              fontSize = 10.sp,
              color = EarthBrownSand
            )
          }
        }
      }
    }
  }
}

@Composable
private fun FarmerIncomingOrderCard(
  order: Order,
  onCallBuyer: (String) -> Unit,
  onUpdateOrderStatus: (Long, String) -> Unit
) {
  Card(
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White),
    border = BorderStroke(1.dp, EarthBrownBorder),
    modifier = Modifier
      .fillMaxWidth()
      .testTag("farmer_order_card_${order.id}")
  ) {
    Column(modifier = Modifier.padding(12.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column {
          Text(
            text = "${order.produceName} (${order.quantity.toInt()} ${order.unit})",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
          )
          Text(
            text = "Direct Total: ₹${order.totalPrice.toInt()}",
            fontSize = 13.sp,
            fontWeight = FontWeight.ExtraBold,
            color = DarkGreenPrimary
          )
        }

        Surface(
          shape = RoundedCornerShape(6.dp),
          color = if (order.status == "Delivered") DarkGreenContainer else EarthBrownSand,
          border = BorderStroke(0.8.dp, if (order.status == "Delivered") DarkGreenDark else EarthBrownBorder)
        ) {
          Text(
            text = order.status,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = if (order.status == "Delivered") DarkGreenDark else EarthBrownDark,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
          )
        }
      }

      Spacer(modifier = Modifier.height(6.dp))
      Text(
        text = "Buyer: ${order.buyerName} (${order.buyerPhone})",
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        color = EarthBrownDark
      )
      Text(
        text = "Address: ${order.deliveryAddress}",
        fontSize = 12.sp,
        color = EarthBrownWarm
      )

      Spacer(modifier = Modifier.height(10.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        OutlinedButton(
          onClick = { onCallBuyer(order.buyerPhone) },
          shape = RoundedCornerShape(8.dp),
          border = BorderStroke(1.dp, EarthBrownBorder),
          modifier = Modifier.weight(1f)
        ) {
          Icon(Icons.Default.Call, contentDescription = "Call Buyer", tint = EarthBrownDark, modifier = Modifier.size(16.dp))
          Spacer(modifier = Modifier.width(4.dp))
          Text("Call Buyer", fontSize = 12.sp, color = EarthBrownDark)
        }

        if (order.status != "Delivered") {
          Button(
            onClick = {
              val nextStatus = if (order.status == "Order Placed") "Confirmed" else "Delivered"
              onUpdateOrderStatus(order.id, nextStatus)
            },
            colors = ButtonDefaults.buttonColors(containerColor = DarkGreenPrimary),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.weight(1f)
          ) {
            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(
              text = if (order.status == "Order Placed") "Confirm" else "Mark Delivered",
              fontSize = 12.sp,
              fontWeight = FontWeight.Bold
            )
          }
        }
      }
    }
  }
}

@Composable
private fun FarmerProduceListingCard(
  produce: ProduceItem,
  onDelete: () -> Unit
) {
  Card(
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = Color.White),
    border = BorderStroke(1.dp, EarthBrownBorder),
    modifier = Modifier
      .fillMaxWidth()
      .testTag("farmer_produce_${produce.id}")
  ) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(14.dp),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Column(modifier = Modifier.weight(1f)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text(
            text = produce.name,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
          )
          if (produce.isOrganic) {
            Spacer(modifier = Modifier.width(6.dp))
            Surface(shape = RoundedCornerShape(4.dp), color = DarkGreenContainer) {
              Text(
                text = "Organic",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = DarkGreenDark,
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
              )
            }
          }
        }

        Spacer(modifier = Modifier.height(2.dp))
        Text(
          text = "Farm Price: ₹${produce.farmPrice.toInt()} / ${produce.unit} (Market: ₹${produce.middlemanPrice.toInt()})",
          fontSize = 13.sp,
          fontWeight = FontWeight.SemiBold,
          color = DarkGreenPrimary
        )
        Text(
          text = "Stock Remaining: ${produce.quantityAvailable.toInt()} ${produce.unit} • ${produce.harvestDate}",
          fontSize = 12.sp,
          color = EarthBrownWarm
        )
      }

      IconButton(
        onClick = onDelete,
        modifier = Modifier.testTag("delete_produce_${produce.id}")
      ) {
        Icon(
          imageVector = Icons.Default.Delete,
          contentDescription = "Delete Crop",
          tint = HarvestRedTertiary
        )
      }
    }
  }
}
