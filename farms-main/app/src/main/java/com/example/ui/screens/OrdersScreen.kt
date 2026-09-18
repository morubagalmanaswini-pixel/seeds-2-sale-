package com.example.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import com.example.ui.theme.EarthBrownBorder
import com.example.ui.theme.EarthBrownDeep
import com.example.ui.theme.EarthBrownSand
import com.example.ui.theme.EarthBrownWarm
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import com.example.ui.theme.DarkGreenContainer
import com.example.ui.theme.DarkGreenDark
import com.example.ui.theme.DarkGreenPrimary
import com.example.ui.theme.EarthBrownContainer
import com.example.ui.theme.EarthBrownDark
import com.example.ui.theme.EarthBrownSecondary
import com.example.ui.theme.HarvestRedContainer
import com.example.ui.theme.HarvestRedTertiary
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun OrdersScreen(
  orders: List<Order>,
  onDeleteOrder: (Long) -> Unit,
  modifier: Modifier = Modifier
) {
  val context = LocalContext.current
  val totalSaved = orders.sumOf { it.totalSavings }
  val totalSpent = orders.sumOf { it.totalPrice }

  BoxWithConstraints(
    modifier = modifier
      .fillMaxSize()
      .background(Color(0xFFF7F8F4))
      .padding(16.dp)
      .testTag("orders_screen")
  ) {
    val gridColumns = when {
      maxWidth >= 1000.dp -> 3
      maxWidth >= 600.dp -> 2
      else -> 1
    }

    Column(modifier = Modifier.fillMaxSize()) {
      // Top Hero Card: Cumulative Savings from Middlemen in Earth Brown Dark
      Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = EarthBrownDark),
        border = BorderStroke(1.dp, EarthBrownBorder),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(16.dp)) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
              modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(HarvestRedTertiary),
              contentAlignment = Alignment.Center
            ) {
              Icon(
                imageVector = Icons.Default.Savings,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(20.dp)
              )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
              Text(
                text = "Direct Consumer Impact",
                color = Color.White,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold
              )
              Text(
                text = "Bypassing brokers & commission agents",
                color = EarthBrownSand,
                fontSize = 11.sp
              )
            }
          }

          Spacer(modifier = Modifier.height(14.dp))

          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
          ) {
            Surface(
              shape = RoundedCornerShape(10.dp),
              color = EarthBrownDeep,
              border = BorderStroke(0.8.dp, EarthBrownWarm),
              modifier = Modifier.weight(1f)
            ) {
              Column(modifier = Modifier.padding(10.dp)) {
                Text(
                  text = "Total Paid to Farmers",
                  fontSize = 11.sp,
                  color = EarthBrownSand
                )
                Text(
                  text = "₹${totalSpent.toInt()}",
                  fontSize = 18.sp,
                  fontWeight = FontWeight.Bold,
                  color = Color.White
                )
              }
            }

            Spacer(modifier = Modifier.width(10.dp))

            Surface(
              shape = RoundedCornerShape(10.dp),
              color = HarvestRedTertiary,
              modifier = Modifier.weight(1f)
            ) {
              Column(modifier = Modifier.padding(10.dp)) {
                Text(
                  text = "Saved From Middlemen",
                  fontSize = 11.sp,
                  color = Color(0xFFFFCDD2)
                )
                Text(
                  text = "₹${totalSaved.toInt()}",
                  fontSize = 18.sp,
                  fontWeight = FontWeight.ExtraBold,
                  color = Color.White
                )
              }
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      Text(
        text = "Your Direct Farm Orders (${orders.size})",
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        color = DarkGreenDark
      )

      Spacer(modifier = Modifier.height(8.dp))

      if (orders.isEmpty()) {
        Box(
          modifier = Modifier
            .fillMaxWidth()
            .weight(1f),
          contentAlignment = Alignment.Center
        ) {
          Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
              imageVector = Icons.Default.ShoppingBag,
              contentDescription = null,
              tint = Color(0xFFAAAAAA),
              modifier = Modifier.size(54.dp)
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
              text = "No direct orders placed yet",
              fontSize = 16.sp,
              fontWeight = FontWeight.SemiBold,
              color = Color(0xFF666666)
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              text = "Browse fresh harvest items and order directly from local farmers!",
              fontSize = 13.sp,
              color = Color(0xFF888888),
              modifier = Modifier.padding(horizontal = 32.dp),
              textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
          }
        }
      } else {
        LazyVerticalGrid(
          columns = GridCells.Fixed(gridColumns),
          verticalArrangement = Arrangement.spacedBy(12.dp),
          horizontalArrangement = Arrangement.spacedBy(12.dp),
          modifier = Modifier.fillMaxWidth().weight(1f)
        ) {
          items(orders, key = { it.id }) { order ->
            val formattedDate = SimpleDateFormat("dd MMM, hh:mm a", Locale.getDefault())
              .format(Date(order.timestamp))

            Card(
              shape = RoundedCornerShape(14.dp),
              colors = CardDefaults.cardColors(containerColor = Color.White),
              border = BorderStroke(1.dp, EarthBrownBorder),
              modifier = Modifier
                .fillMaxWidth()
                .testTag("order_item_${order.id}")
            ) {
              Column(modifier = Modifier.padding(14.dp)) {
                Row(
                  modifier = Modifier.fillMaxWidth(),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically
                ) {
                  Column {
                    Text(
                      text = order.produceName,
                      fontSize = 16.sp,
                      fontWeight = FontWeight.Bold,
                      color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                      text = "${order.quantity.toInt()} ${order.unit} @ ₹${order.unitPrice.toInt()}/${order.unit}",
                      fontSize = 13.sp,
                      color = Color.Gray
                    )
                  }

                  Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = DarkGreenContainer
                  ) {
                    Text(
                      text = order.status,
                      fontSize = 11.sp,
                      fontWeight = FontWeight.Bold,
                      color = DarkGreenDark,
                      modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                  }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Middleman savings strip
                Surface(
                  shape = RoundedCornerShape(8.dp),
                  color = HarvestRedContainer,
                  modifier = Modifier.fillMaxWidth()
                ) {
                  Row(
                    modifier = Modifier
                      .fillMaxWidth()
                      .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                  ) {
                    Text(
                      text = "Total Paid: ₹${order.totalPrice.toInt()}",
                      fontSize = 13.sp,
                      fontWeight = FontWeight.Bold,
                      color = DarkGreenPrimary
                    )
                    Text(
                      text = "Saved from middlemen: ₹${order.totalSavings.toInt()}",
                      fontSize = 12.sp,
                      fontWeight = FontWeight.ExtraBold,
                      color = HarvestRedTertiary
                    )
                  }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Farmer Contact & Delivery Info in Rustic Earth Brown Sand Container
                Surface(
                  shape = RoundedCornerShape(8.dp),
                  color = EarthBrownSand,
                  border = BorderStroke(0.8.dp, EarthBrownBorder),
                  modifier = Modifier.fillMaxWidth()
                ) {
                  Row(
                    modifier = Modifier
                      .fillMaxWidth()
                      .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                  ) {
                    Column(modifier = Modifier.weight(1f)) {
                      Text(
                        text = "Farmer: ${order.farmerName}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = EarthBrownDark
                      )
                      Text(
                        text = "Deliver to: ${order.deliveryAddress}",
                        fontSize = 11.sp,
                        color = EarthBrownWarm,
                        maxLines = 1
                      )
                      Text(
                        text = "Placed: $formattedDate",
                        fontSize = 10.sp,
                        color = Color.Gray
                      )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                      IconButton(
                        onClick = {
                          val intent = Intent(Intent.ACTION_DIAL).apply {
                            data = Uri.parse("tel:${order.farmerPhone.replace(" ", "")}")
                          }
                          context.startActivity(intent)
                        },
                        modifier = Modifier.testTag("call_order_farmer_${order.id}")
                      ) {
                        Icon(
                          imageVector = Icons.Default.Call,
                          contentDescription = "Call Farmer",
                          tint = DarkGreenPrimary
                        )
                      }

                      IconButton(
                        onClick = { onDeleteOrder(order.id) },
                        modifier = Modifier.testTag("delete_order_${order.id}")
                      ) {
                        Icon(
                          imageVector = Icons.Default.Delete,
                          contentDescription = "Cancel/Delete",
                          tint = Color.Gray
                        )
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
