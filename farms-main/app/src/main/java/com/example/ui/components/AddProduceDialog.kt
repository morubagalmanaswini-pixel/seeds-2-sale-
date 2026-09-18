package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.ui.theme.DarkGreenContainer
import com.example.ui.theme.DarkGreenDark
import com.example.ui.theme.DarkGreenPrimary
import com.example.ui.theme.EarthBrownContainer
import com.example.ui.theme.EarthBrownDark
import com.example.ui.theme.EarthBrownSecondary
import com.example.ui.theme.HarvestRedTertiary

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddProduceDialog(
  onDismiss: () -> Unit,
  onAddProduce: (
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
  ) -> Unit
) {
  val categories = listOf("Vegetables", "Fruits", "Grains", "Pulses", "Dairy", "Honey")
  val units = listOf("kg", "dozen", "litre", "crate", "bunch")

  var name by remember { mutableStateOf("") }
  var selectedCategory by remember { mutableStateOf("Vegetables") }
  var farmPriceStr by remember { mutableStateOf("") }
  var middlemanPriceStr by remember { mutableStateOf("") }
  var selectedUnit by remember { mutableStateOf("kg") }
  var quantityStr by remember { mutableStateOf("") }
  var farmerName by remember { mutableStateOf("") }
  var farmName by remember { mutableStateOf("") }
  var farmerPhone by remember { mutableStateOf("") }
  var location by remember { mutableStateOf("") }
  var isOrganic by remember { mutableStateOf(true) }
  var harvestDate by remember { mutableStateOf("Harvested Today") }
  var description by remember { mutableStateOf("") }
  var errorMessage by remember { mutableStateOf<String?>(null) }

  Dialog(onDismissRequest = onDismiss) {
    Card(
      shape = RoundedCornerShape(20.dp),
      colors = CardDefaults.cardColors(containerColor = Color.White),
      modifier = Modifier
        .fillMaxWidth()
        .padding(vertical = 12.dp)
        .testTag("add_produce_dialog")
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
              text = "List Farm Produce",
              fontSize = 20.sp,
              fontWeight = FontWeight.Bold,
              color = DarkGreenPrimary
            )
            Text(
              text = "Direct farm-gate listing • Zero broker fees",
              fontSize = 12.sp,
              color = EarthBrownSecondary
            )
          }
          IconButton(
            onClick = onDismiss,
            modifier = Modifier.testTag("close_add_produce_dialog")
          ) {
            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.Gray)
          }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Crop / Produce Name
        OutlinedTextField(
          value = name,
          onValueChange = { name = it },
          label = { Text("Crop / Produce Name (e.g., Red Onion)") },
          singleLine = true,
          modifier = Modifier
            .fillMaxWidth()
            .testTag("input_produce_name"),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DarkGreenPrimary,
            unfocusedBorderColor = Color(0xFFB0BEC5)
          )
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Category selection
        Text(
          text = "Category",
          fontSize = 12.sp,
          fontWeight = FontWeight.SemiBold,
          color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(6.dp))
        FlowRow(
          horizontalArrangement = Arrangement.spacedBy(6.dp),
          verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
          categories.forEach { cat ->
            val isSelected = selectedCategory == cat
            Surface(
              shape = RoundedCornerShape(8.dp),
              color = if (isSelected) DarkGreenPrimary else EarthBrownContainer,
              modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .clickable { selectedCategory = cat }
            ) {
              Text(
                text = cat,
                color = if (isSelected) Color.White else EarthBrownDark,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
              )
            }
          }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Pricing Inputs: Farm Price vs Middleman Retail Price
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
          OutlinedTextField(
            value = farmPriceStr,
            onValueChange = { farmPriceStr = it },
            label = { Text("Farm Gate (₹)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier
              .weight(1f)
              .testTag("input_farm_price"),
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = DarkGreenPrimary,
              unfocusedBorderColor = Color(0xFFB0BEC5)
            )
          )

          OutlinedTextField(
            value = middlemanPriceStr,
            onValueChange = { middlemanPriceStr = it },
            label = { Text("Market/Broker (₹)") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier
              .weight(1f)
              .testTag("input_middleman_price"),
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = HarvestRedTertiary,
              unfocusedBorderColor = Color(0xFFB0BEC5)
            )
          )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Unit and Quantity
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
          OutlinedTextField(
            value = quantityStr,
            onValueChange = { quantityStr = it },
            label = { Text("Available Qty") },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            singleLine = true,
            modifier = Modifier
              .weight(1f)
              .testTag("input_quantity"),
            colors = OutlinedTextFieldDefaults.colors(
              focusedBorderColor = DarkGreenPrimary,
              unfocusedBorderColor = Color(0xFFB0BEC5)
            )
          )

          // Unit selection chips in column
          Column(modifier = Modifier.weight(1f)) {
            Text(text = "Unit", fontSize = 11.sp, color = Color.Gray)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
              units.take(3).forEach { u ->
                val isSelected = selectedUnit == u
                Surface(
                  shape = RoundedCornerShape(6.dp),
                  color = if (isSelected) EarthBrownSecondary else Color(0xFFEEEEEE),
                  modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .clickable { selectedUnit = u }
                ) {
                  Text(
                    text = u,
                    color = if (isSelected) Color.White else Color.Black,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
                  )
                }
              }
            }
          }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Farmer info
        OutlinedTextField(
          value = farmerName,
          onValueChange = { farmerName = it },
          label = { Text("Farmer Name") },
          singleLine = true,
          modifier = Modifier.fillMaxWidth(),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DarkGreenPrimary,
            unfocusedBorderColor = Color(0xFFB0BEC5)
          )
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
          value = farmName,
          onValueChange = { farmName = it },
          label = { Text("Farm / Orchard Name") },
          singleLine = true,
          modifier = Modifier.fillMaxWidth(),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DarkGreenPrimary,
            unfocusedBorderColor = Color(0xFFB0BEC5)
          )
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
          value = farmerPhone,
          onValueChange = { farmerPhone = it },
          label = { Text("Farmer Phone (for direct calls)") },
          keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
          singleLine = true,
          modifier = Modifier.fillMaxWidth(),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DarkGreenPrimary,
            unfocusedBorderColor = Color(0xFFB0BEC5)
          )
        )

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedTextField(
          value = location,
          onValueChange = { location = it },
          label = { Text("Location / Village / District") },
          singleLine = true,
          modifier = Modifier.fillMaxWidth(),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = DarkGreenPrimary,
            unfocusedBorderColor = Color(0xFFB0BEC5)
          )
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Organic check
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier.fillMaxWidth()
        ) {
          Checkbox(
            checked = isOrganic,
            onCheckedChange = { isOrganic = it },
            colors = CheckboxDefaults.colors(checkedColor = DarkGreenPrimary)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "100% Organic / Pesticide Free",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = DarkGreenDark
          )
        }

        OutlinedTextField(
          value = description,
          onValueChange = { description = it },
          label = { Text("Harvest Details (Taste, Soil, Variety)") },
          maxLines = 2,
          modifier = Modifier.fillMaxWidth(),
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

        Button(
          onClick = {
            val fp = farmPriceStr.toDoubleOrNull()
            val mp = middlemanPriceStr.toDoubleOrNull()
            val qty = quantityStr.toDoubleOrNull()

            if (name.isBlank()) {
              errorMessage = "Please enter produce name"
              return@Button
            }
            if (fp == null || fp <= 0) {
              errorMessage = "Please enter a valid farm price"
              return@Button
            }
            val calculatedMp = mp ?: (fp * 1.5)
            if (qty == null || qty <= 0) {
              errorMessage = "Please enter valid available quantity"
              return@Button
            }
            if (farmerName.isBlank()) {
              errorMessage = "Please enter farmer name"
              return@Button
            }
            if (farmerPhone.isBlank()) {
              errorMessage = "Please enter contact phone"
              return@Button
            }

            errorMessage = null
            onAddProduce(
              name,
              selectedCategory,
              fp,
              calculatedMp,
              selectedUnit,
              qty,
              farmerName,
              if (farmName.isBlank()) "Local Farm" else farmName,
              farmerPhone,
              if (location.isBlank()) "Nearby Farm" else location,
              isOrganic,
              harvestDate,
              description
            )
          },
          colors = ButtonDefaults.buttonColors(containerColor = DarkGreenPrimary),
          shape = RoundedCornerShape(12.dp),
          modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .testTag("submit_produce_button")
        ) {
          Text(
            text = "Publish Direct Listing",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
          )
        }
      }
    }
  }
}
