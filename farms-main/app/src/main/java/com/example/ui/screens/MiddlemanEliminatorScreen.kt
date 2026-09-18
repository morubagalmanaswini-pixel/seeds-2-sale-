package com.example.ui.screens

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
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MonetizationOn
import androidx.compose.material.icons.filled.MoneyOff
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.DarkGreenContainer
import com.example.ui.theme.DarkGreenDark
import com.example.ui.theme.DarkGreenPrimary
import com.example.ui.theme.EarthBrownBorder
import com.example.ui.theme.EarthBrownContainer
import com.example.ui.theme.EarthBrownDark
import com.example.ui.theme.EarthBrownDeep
import com.example.ui.theme.EarthBrownSand
import com.example.ui.theme.EarthBrownSecondary
import com.example.ui.theme.EarthBrownWarm
import com.example.ui.theme.HarvestRedContainer
import com.example.ui.theme.HarvestRedTertiary
import androidx.compose.foundation.layout.BoxWithConstraints

@Composable
fun MiddlemanEliminatorScreen(
  modifier: Modifier = Modifier
) {
  var sampleCropPriceFarm by remember { mutableDoubleStateOf(25.0) }
  var sampleCropPriceRetail by remember { mutableDoubleStateOf(50.0) }
  var quantityKg by remember { mutableDoubleStateOf(10.0) }

  val totalDirectFarm = sampleCropPriceFarm * quantityKg
  val totalMiddlemanRetail = sampleCropPriceRetail * quantityKg
  val savings = (totalMiddlemanRetail - totalDirectFarm).coerceAtLeast(0.0)
  val middlemanCutTaken = savings

  BoxWithConstraints(
    modifier = modifier
      .fillMaxSize()
      .background(Color(0xFFF7F8F4))
      .testTag("middleman_eliminator_screen")
  ) {
    val isWideScreen = maxWidth >= 700.dp

    Column(
      modifier = Modifier
        .fillMaxSize()
        .verticalScroll(rememberScrollState())
        .padding(if (isWideScreen) 24.dp else 16.dp)
    ) {
    // Top Hero Card: Why Eliminate Middlemen
    Card(
      shape = RoundedCornerShape(16.dp),
      colors = CardDefaults.cardColors(containerColor = DarkGreenPrimary),
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
              imageVector = Icons.Default.MoneyOff,
              contentDescription = null,
              tint = Color.White,
              modifier = Modifier.size(20.dp)
            )
          }
          Spacer(modifier = Modifier.width(10.dp))
          Text(
            text = "The Middleman Dilemma",
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
          )
        }

        Spacer(modifier = Modifier.height(10.dp))

        Text(
          text = "In conventional agricultural markets, 4 to 6 layers of brokers, wholesale agents, and retailers take up to 60% of the produce price. Farmers struggle while consumers overpay for stale produce.",
          fontSize = 13.sp,
          color = Color(0xFFD4EED8),
          lineHeight = 19.sp
        )

        Spacer(modifier = Modifier.height(10.dp))

        Surface(
          shape = RoundedCornerShape(8.dp),
          color = Color(0xFF143D21),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier.padding(10.dp),
            horizontalArrangement = Arrangement.SpaceAround
          ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
              Text(
                text = "100%",
                color = Color(0xFF76D896),
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold
              )
              Text(
                text = "Paid to Farmer",
                color = Color.White,
                fontSize = 11.sp
              )
            }
            Box(
              modifier = Modifier
                .width(1.dp)
                .height(30.dp)
                .background(Color(0xFF2C6B43))
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
              Text(
                text = "35-50%",
                color = HarvestRedContainer,
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold
              )
              Text(
                text = "Consumer Savings",
                color = Color.White,
                fontSize = 11.sp
              )
            }
            Box(
              modifier = Modifier
                .width(1.dp)
                .height(30.dp)
                .background(Color(0xFF2C6B43))
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
              Text(
                text = "0%",
                color = Color(0xFFFFCDD2),
                fontSize = 18.sp,
                fontWeight = FontWeight.ExtraBold
              )
              Text(
                text = "Broker Cut",
                color = Color.White,
                fontSize = 11.sp
              )
            }
          }
        }
      }
    }

    Spacer(modifier = Modifier.height(18.dp))

    // Interactive Middleman Calculator Card
    Card(
      shape = RoundedCornerShape(16.dp),
      colors = CardDefaults.cardColors(containerColor = Color.White),
      border = BorderStroke(1.dp, Color(0xFFE0E5DC)),
      modifier = Modifier.fillMaxWidth()
    ) {
      Column(modifier = Modifier.padding(16.dp)) {
        Text(
          text = "Interactive Fair-Trade Simulator",
          fontSize = 16.sp,
          fontWeight = FontWeight.Bold,
          color = DarkGreenDark
        )
        Text(
          text = "See how much middlemen extract vs direct farm purchasing",
          fontSize = 12.sp,
          color = EarthBrownSecondary
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Quantity Slider
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = "Order Quantity:",
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
          )
          Text(
            text = "${quantityKg.toInt()} kg",
            fontSize = 15.sp,
            fontWeight = FontWeight.ExtraBold,
            color = DarkGreenPrimary
          )
        }

        Slider(
          value = quantityKg.toFloat(),
          onValueChange = { quantityKg = it.toDouble() },
          valueRange = 1f..100f,
          steps = 98,
          colors = SliderDefaults.colors(
            thumbColor = DarkGreenPrimary,
            activeTrackColor = DarkGreenPrimary,
            inactiveTrackColor = DarkGreenContainer
          ),
          modifier = Modifier.testTag("quantity_slider")
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Comparison Rows
        // Direct Farm Price
        Surface(
          shape = RoundedCornerShape(10.dp),
          color = DarkGreenContainer,
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(
                imageVector = Icons.Default.Check,
                contentDescription = null,
                tint = DarkGreenPrimary,
                modifier = Modifier.size(18.dp)
              )
              Spacer(modifier = Modifier.width(8.dp))
              Column {
                Text(
                  text = "FarmDirect Cost",
                  fontSize = 13.sp,
                  fontWeight = FontWeight.Bold,
                  color = DarkGreenDark
                )
                Text(
                  text = "₹${sampleCropPriceFarm.toInt()}/kg directly to farmer",
                  fontSize = 11.sp,
                  color = DarkGreenDark
                )
              }
            }
            Text(
              text = "₹${totalDirectFarm.toInt()}",
              fontSize = 18.sp,
              fontWeight = FontWeight.ExtraBold,
              color = DarkGreenPrimary
            )
          }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Conventional Retail Price
        Surface(
          shape = RoundedCornerShape(10.dp),
          color = EarthBrownContainer,
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(
                imageVector = Icons.Default.Close,
                contentDescription = null,
                tint = EarthBrownDark,
                modifier = Modifier.size(18.dp)
              )
              Spacer(modifier = Modifier.width(8.dp))
              Column {
                Text(
                  text = "Conventional Market Cost",
                  fontSize = 13.sp,
                  fontWeight = FontWeight.Bold,
                  color = EarthBrownDark
                )
                Text(
                  text = "₹${sampleCropPriceRetail.toInt()}/kg through middlemen",
                  fontSize = 11.sp,
                  color = EarthBrownDark
                )
              }
            }
            Text(
              text = "₹${totalMiddlemanRetail.toInt()}",
              fontSize = 18.sp,
              fontWeight = FontWeight.ExtraBold,
              color = EarthBrownDark
            )
          }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Total Middleman Cut Saved Banner
        Surface(
          shape = RoundedCornerShape(12.dp),
          color = HarvestRedContainer,
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(
                imageVector = Icons.Default.Savings,
                contentDescription = null,
                tint = HarvestRedTertiary,
                modifier = Modifier.size(22.dp)
              )
              Spacer(modifier = Modifier.width(8.dp))
              Column {
                Text(
                  text = "Middleman Extortion Prevented",
                  fontSize = 13.sp,
                  fontWeight = FontWeight.ExtraBold,
                  color = HarvestRedTertiary
                )
                Text(
                  text = "Money kept in consumer & farmer hands",
                  fontSize = 11.sp,
                  color = Color(0xFFB71C1C)
                )
              }
            }
            Text(
              text = "₹${savings.toInt()}",
              fontSize = 20.sp,
              fontWeight = FontWeight.ExtraBold,
              color = HarvestRedTertiary
            )
          }
        }
      }
    }

    Spacer(modifier = Modifier.height(18.dp))

    // Chain Comparison: Traditional vs FarmDirect
    Text(
      text = "Where Does Your Money Go?",
      fontSize = 16.sp,
      fontWeight = FontWeight.Bold,
      color = DarkGreenDark
    )
    Spacer(modifier = Modifier.height(8.dp))

    // Traditional supply chain breakdown
    Card(
      shape = RoundedCornerShape(14.dp),
      colors = CardDefaults.cardColors(containerColor = EarthBrownSand),
      border = BorderStroke(1.dp, EarthBrownBorder),
      modifier = Modifier.fillMaxWidth()
    ) {
      Column(modifier = Modifier.padding(14.dp)) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween
        ) {
          Text(
            text = "❌ Conventional Supply Chain",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = HarvestRedTertiary
          )
          Text(
            text = "Farmer Gets: ~35%",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = HarvestRedTertiary
          )
        }
        Spacer(modifier = Modifier.height(8.dp))

        val middlemenSteps = listOf(
          "1. Village Broker (Dalal)" to "Takes 10% cut",
          "2. Transport / Mandi Agent" to "Takes 15% fee",
          "3. Wholesale Trader (Arhatiya)" to "Takes 15% margin",
          "4. City Distributor" to "Takes 10% markup",
          "5. Supermarket / Retailer" to "Takes 20% margin"
        )
        middlemenSteps.forEach { (step, cut) ->
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(vertical = 3.dp),
            horizontalArrangement = Arrangement.SpaceBetween
          ) {
            Text(text = step, fontSize = 12.sp, color = EarthBrownDark)
            Text(text = cut, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = EarthBrownWarm)
          }
        }
      }
    }

    Spacer(modifier = Modifier.height(10.dp))

    // FarmDirect Model
    Card(
      shape = RoundedCornerShape(14.dp),
      colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F8F1)),
      border = BorderStroke(1.5.dp, DarkGreenPrimary),
      modifier = Modifier.fillMaxWidth()
    ) {
      Column(modifier = Modifier.padding(14.dp)) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween
        ) {
          Text(
            text = "✓ FarmDirect Ecosystem",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = DarkGreenPrimary
          )
          Text(
            text = "Farmer Gets: 100%",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = DarkGreenPrimary
          )
        }
        Spacer(modifier = Modifier.height(8.dp))

        val directSteps = listOf(
          "1. Farmer Harvests Fresh" to "Sets fair farm price",
          "2. Direct Connection in App" to "Zero commission",
          "3. Consumer Receives Direct" to "Zero broker fees"
        )
        directSteps.forEach { (step, benefit) ->
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(vertical = 3.dp),
            horizontalArrangement = Arrangement.SpaceBetween
          ) {
            Text(text = step, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = DarkGreenDark)
            Text(text = benefit, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = DarkGreenPrimary)
          }
        }
      }
    }

    Spacer(modifier = Modifier.height(14.dp))

    // Soil & Earth Living Impact Card in Earth Brown Sand & Warm
    Surface(
      shape = RoundedCornerShape(14.dp),
      color = EarthBrownSand,
      border = BorderStroke(1.dp, EarthBrownBorder),
      modifier = Modifier.fillMaxWidth()
    ) {
      Column(modifier = Modifier.padding(14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Box(
            modifier = Modifier
              .size(32.dp)
              .clip(CircleShape)
              .background(EarthBrownWarm),
            contentAlignment = Alignment.Center
          ) {
            Icon(
              imageVector = Icons.Default.TrendingUp,
              contentDescription = null,
              tint = Color.White,
              modifier = Modifier.size(18.dp)
            )
          }
          Spacer(modifier = Modifier.width(10.dp))
          Text(
            text = "Healthy Soil & Fair Livelihood",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = EarthBrownDark
          )
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
          text = "When brokers are bypassed, farmers retain the economic security to invest in soil rejuvenation, drip irrigation, and zero-distress harvesting.",
          fontSize = 12.sp,
          color = EarthBrownDark,
          lineHeight = 17.sp
        )
      }
    }
  }
}
}
