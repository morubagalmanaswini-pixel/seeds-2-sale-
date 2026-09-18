package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.MoneyOff
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.data.model.ProduceItem
import com.example.ui.theme.DarkGreenContainer
import com.example.ui.theme.DarkGreenDark
import com.example.ui.theme.DarkGreenPrimary
import com.example.ui.theme.EarthBrownDark
import com.example.ui.theme.EarthBrownSecondary
import com.example.ui.theme.HarvestRedContainer
import com.example.ui.theme.HarvestRedTertiary

@Composable
fun DirectOrderDialog(
  produce: ProduceItem,
  onDismiss: () -> Unit,
  onConfirmOrder: (quantity: Double, name: String, phone: String, address: String) -> Unit
) {
  var quantity by remember { mutableDoubleStateOf(1.0) }
  var buyerName by remember { mutableStateOf("") }
  var buyerPhone by remember { mutableStateOf("") }
  var deliveryAddress by remember { mutableStateOf("") }
  var paymentMode by remember { mutableStateOf("QR / UPI") }
  var errorMessage by remember { mutableStateOf<String?>(null) }

  val totalPrice = produce.farmPrice * quantity
  val middlemanPrice = produce.middlemanPrice * quantity
  val totalSavings = (middlemanPrice - totalPrice).coerceAtLeast(0.0)

  Dialog(onDismissRequest = onDismiss) {
    Card(
      shape = RoundedCornerShape(20.dp),
      colors = CardDefaults.cardColors(containerColor = Color.White),
      modifier = Modifier
        .fillMaxWidth()
        .padding(vertical = 16.dp)
        .testTag("direct_order_dialog")
    ) {
      Column(
        modifier = Modifier
          .padding(20.dp)
          .verticalScroll(rememberScrollState())
      ) {
        // Header
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Column {
            Text(
              text = "Direct Farm Order",
              fontSize = 20.sp,
              fontWeight = FontWeight.Bold,
              color = DarkGreenPrimary
            )
            Text(
              text = "100% of payment reaches the farmer",
              fontSize = 12.sp,
              color = EarthBrownSecondary,
              fontWeight = FontWeight.Medium
            )
          }
          IconButton(
            onClick = onDismiss,
            modifier = Modifier.testTag("close_order_dialog")
          ) {
            Icon(
              imageVector = Icons.Default.Close,
              contentDescription = "Close",
              tint = Color.Gray
            )
          }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Selected Produce Info
        Surface(
          shape = RoundedCornerShape(12.dp),
          color = Color(0xFFF7F8F4),
          border = BorderStroke(1.dp, Color(0xFFE2E7DE)),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column(modifier = Modifier.weight(1f)) {
              Text(
                text = produce.name,
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp,
                color = MaterialTheme.colorScheme.onSurface
              )
              Text(
                text = "Farmer: ${produce.farmerName} (${produce.farmName})",
                fontSize = 12.sp,
                color = EarthBrownDark
              )
              Text(
                text = "Direct Rate: ₹${produce.farmPrice.toInt()} / ${produce.unit}",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = DarkGreenPrimary
              )
            }
          }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Quantity Stepper
        Text(
          text = "Quantity (${produce.unit})",
          fontSize = 13.sp,
          fontWeight = FontWeight.SemiBold,
          color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(
          modifier = Modifier.fillMaxWidth(),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.SpaceBetween
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedButton(
              onClick = {
                if (quantity > 1.0) quantity -= 1.0
              },
              shape = RoundedCornerShape(8.dp),
              modifier = Modifier.size(42.dp),
              contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp)
            ) {
              Icon(Icons.Default.Remove, contentDescription = "Decrease")
            }

            Text(
              text = "${quantity.toInt()} ${produce.unit}",
              fontSize = 16.sp,
              fontWeight = FontWeight.Bold,
              modifier = Modifier.padding(horizontal = 16.dp)
            )

            OutlinedButton(
              onClick = {
                if (quantity < produce.quantityAvailable) quantity += 1.0
              },
              shape = RoundedCornerShape(8.dp),
              modifier = Modifier.size(42.dp),
              contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp)
            ) {
              Icon(Icons.Default.Add, contentDescription = "Increase")
            }
          }

          Text(
            text = "Max: ${produce.quantityAvailable.toInt()} ${produce.unit}",
            fontSize = 11.sp,
            color = Color.Gray
          )
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Middleman Elimination Cost Breakdown
        Surface(
          shape = RoundedCornerShape(12.dp),
          color = HarvestRedContainer,
          modifier = Modifier.fillMaxWidth()
        ) {
          Column(modifier = Modifier.padding(12.dp)) {
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween
            ) {
              Text(
                text = "Direct Farm Total:",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = DarkGreenPrimary
              )
              Text(
                text = "₹${totalPrice.toInt()}",
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                color = DarkGreenPrimary
              )
            }

            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween
            ) {
              Text(
                text = "Retail Middleman Would Charge:",
                fontSize = 12.sp,
                color = Color(0xFF616161)
              )
              Text(
                text = "₹${middlemanPrice.toInt()}",
                fontSize = 12.sp,
                color = Color(0xFF616161)
              )
            }

            Spacer(modifier = Modifier.height(4.dp))
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = Alignment.CenterVertically
            ) {
              Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                  imageVector = Icons.Default.MoneyOff,
                  contentDescription = null,
                  tint = HarvestRedTertiary,
                  modifier = Modifier.size(14.dp)
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                  text = "Middleman Cost Slashed:",
                  fontSize = 12.sp,
                  fontWeight = FontWeight.Bold,
                  color = HarvestRedTertiary
                )
              }
              Text(
                text = "You save ₹${totalSavings.toInt()}!",
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                color = HarvestRedTertiary
              )
            }
          }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Buyer Fields
        OutlinedTextField(
          value = buyerName,
          onValueChange = { buyerName = it },
          label = { Text("Your Full Name") },
          singleLine = true,
          modifier = Modifier
            .fillMaxWidth()
            .testTag("input_buyer_name"),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DarkGreenPrimary,
            unfocusedBorderColor = Color(0xFFB0BEC5)
          )
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
          value = buyerPhone,
          onValueChange = { buyerPhone = it },
          label = { Text("Contact Phone / WhatsApp") },
          keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
          singleLine = true,
          modifier = Modifier
            .fillMaxWidth()
            .testTag("input_buyer_phone"),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DarkGreenPrimary,
            unfocusedBorderColor = Color(0xFFB0BEC5)
          )
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
          value = deliveryAddress,
          onValueChange = { deliveryAddress = it },
          label = { Text("Delivery Address / Local Colony") },
          maxLines = 3,
          modifier = Modifier
            .fillMaxWidth()
            .testTag("input_buyer_address"),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DarkGreenPrimary,
            unfocusedBorderColor = Color(0xFFB0BEC5)
          )
        )

        if (errorMessage != null) {
          Spacer(modifier = Modifier.height(6.dp))
          Text(
            text = errorMessage!!,
            color = HarvestRedTertiary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium
          )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
          text = "Payment mode",
          fontSize = 13.sp,
          fontWeight = FontWeight.SemiBold,
          color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          listOf("QR / UPI", "Cash").forEach { mode ->
            OutlinedButton(
              onClick = { paymentMode = mode },
              modifier = Modifier
                .weight(1f)
                .testTag("payment_mode_${mode.replace(" ", "_").replace("/", "")}"),
              colors = if (paymentMode == mode) {
                ButtonDefaults.outlinedButtonColors(
                  containerColor = DarkGreenContainer,
                  contentColor = DarkGreenDark
                )
              } else {
                ButtonDefaults.outlinedButtonColors()
              },
              border = BorderStroke(
                1.dp,
                if (paymentMode == mode) DarkGreenPrimary else Color(0xFFB0BEC5)
              )
            ) {
              Text(mode, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
          }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Payment Info pill
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier.padding(bottom = 12.dp)
        ) {
          Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = null,
            tint = DarkGreenPrimary,
            modifier = Modifier.size(16.dp)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = if (paymentMode == "QR / UPI") {
              "Payment: Scan the farmer QR or use UPI directly"
            } else {
              "Payment: Cash directly to the farmer on delivery"
            },
            fontSize = 12.sp,
            color = EarthBrownDark,
            fontWeight = FontWeight.Medium
          )
        }

        // Action Buttons
        Button(
          onClick = {
            if (buyerName.isBlank()) {
              errorMessage = "Please enter your name"
              return@Button
            }
            if (buyerPhone.isBlank()) {
              errorMessage = "Please enter your contact phone"
              return@Button
            }
            if (deliveryAddress.isBlank()) {
              errorMessage = "Please enter your delivery address"
              return@Button
            }
            errorMessage = null
            onConfirmOrder(quantity, buyerName, buyerPhone, deliveryAddress)
          },
          colors = ButtonDefaults.buttonColors(containerColor = DarkGreenPrimary),
          shape = RoundedCornerShape(12.dp),
          modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .testTag("confirm_order_button")
        ) {
          Text(
            text = "Confirm Direct Farm Order (₹${totalPrice.toInt()})",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
          )
        }
      }
    }
  }
}
