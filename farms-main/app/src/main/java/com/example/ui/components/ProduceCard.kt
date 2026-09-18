package com.example.ui.components

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MoneyOff
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.ProduceItem
import com.example.ui.theme.DarkGreenContainer
import com.example.ui.theme.DarkGreenDark
import com.example.ui.theme.DarkGreenPrimary
import com.example.ui.theme.EarthBrownBorder
import com.example.ui.theme.EarthBrownContainer
import com.example.ui.theme.EarthBrownDark
import com.example.ui.theme.EarthBrownSand
import com.example.ui.theme.EarthBrownSecondary
import com.example.ui.theme.EarthBrownWarm
import com.example.ui.theme.HarvestRedContainer
import com.example.ui.theme.HarvestRedTertiary

@Composable
fun ProduceCard(
  produce: ProduceItem,
  onBuyClick: (ProduceItem) -> Unit,
  modifier: Modifier = Modifier
) {
  val context = LocalContext.current

  Card(
    shape = RoundedCornerShape(16.dp),
    colors = CardDefaults.cardColors(
      containerColor = MaterialTheme.colorScheme.surface
    ),
    border = BorderStroke(1.dp, Color(0xFFE0E5DC)),
    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    modifier = modifier
      .fillMaxWidth()
      .testTag("produce_card_${produce.id}")
  ) {
    Column(modifier = Modifier.padding(14.dp)) {
      // Top row: category & organic badges
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
          // Category pill
          Surface(
            shape = RoundedCornerShape(8.dp),
            color = EarthBrownContainer,
            modifier = Modifier.clip(RoundedCornerShape(8.dp))
          ) {
            Text(
              text = produce.category,
              color = EarthBrownDark,
              fontSize = 11.sp,
              fontWeight = FontWeight.SemiBold,
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            )
          }

          if (produce.isOrganic) {
            Surface(
              shape = RoundedCornerShape(8.dp),
              color = DarkGreenContainer,
              modifier = Modifier.clip(RoundedCornerShape(8.dp))
            ) {
              Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp)
              ) {
                Icon(
                  imageVector = Icons.Default.Spa,
                  contentDescription = null,
                  tint = DarkGreenPrimary,
                  modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(3.dp))
                Text(
                  text = "100% Organic",
                  color = DarkGreenDark,
                  fontSize = 11.sp,
                  fontWeight = FontWeight.Bold
                )
              }
            }
          }
        }

        // Freshness status
        Surface(
          shape = RoundedCornerShape(6.dp),
          color = Color(0xFFF1F8E9)
        ) {
          Text(
            text = produce.harvestDate,
            color = DarkGreenPrimary,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
          )
        }
      }

      Spacer(modifier = Modifier.height(10.dp))

      // Produce Name
      Text(
        text = produce.name,
        color = MaterialTheme.colorScheme.onSurface,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold
      )

      // Short Description
      if (produce.description.isNotBlank()) {
        Spacer(modifier = Modifier.height(4.dp))
        Text(
          text = produce.description,
          color = Color(0xFF555555),
          fontSize = 13.sp,
          lineHeight = 18.sp,
          maxLines = 2
        )
      }

      Spacer(modifier = Modifier.height(10.dp))

      // Middleman Elimination & Price Comparison Box
      Surface(
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFFFBFBF8),
        border = BorderStroke(1.dp, Color(0xFFE8E5DF)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(10.dp)) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            // Direct Farm Gate Price
            Column {
              Text(
                text = "DIRECT FARM PRICE",
                color = DarkGreenPrimary,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
              )
              Row(verticalAlignment = Alignment.Bottom) {
                Text(
                  text = "₹${produce.farmPrice.toInt()}",
                  color = DarkGreenPrimary,
                  fontSize = 22.sp,
                  fontWeight = FontWeight.ExtraBold
                )
                Text(
                  text = " / ${produce.unit}",
                  color = Color(0xFF555555),
                  fontSize = 12.sp,
                  fontWeight = FontWeight.Medium,
                  modifier = Modifier.padding(bottom = 2.dp)
                )
              }
            }

            // Middleman Price (strikethrough)
            Column(horizontalAlignment = Alignment.End) {
              Text(
                text = "Middleman Market Price",
                color = Color.Gray,
                fontSize = 10.sp
              )
              Text(
                text = "₹${produce.middlemanPrice.toInt()} / ${produce.unit}",
                color = Color.Gray,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                textDecoration = TextDecoration.LineThrough
              )
            }
          }

          Spacer(modifier = Modifier.height(6.dp))

          // Middleman Slashed highlight banner
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .clip(RoundedCornerShape(6.dp))
              .background(HarvestRedContainer)
              .padding(horizontal = 8.dp, vertical = 4.dp),
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
                text = "Middlemen Cut Eliminated",
                color = HarvestRedTertiary,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
              )
            }
            Text(
              text = "You save ${produce.savingsPercentage}% (₹${produce.savingsPerUnit.toInt()}/${produce.unit})",
              color = HarvestRedTertiary,
              fontSize = 11.sp,
              fontWeight = FontWeight.ExtraBold
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(10.dp))

      // Farmer & Location info with rich rustic earth brown styling
      Surface(
        shape = RoundedCornerShape(10.dp),
        color = EarthBrownSand,
        border = BorderStroke(1.dp, EarthBrownBorder),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(10.dp)) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                tint = EarthBrownSecondary,
                modifier = Modifier.size(15.dp)
              )
              Spacer(modifier = Modifier.width(6.dp))
              Text(
                text = "${produce.farmerName} • ${produce.farmName}",
                color = EarthBrownDark,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold
              )
            }

            Surface(
              shape = RoundedCornerShape(6.dp),
              color = EarthBrownContainer
            ) {
              Text(
                text = "Direct Grower",
                color = EarthBrownWarm,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
              )
            }
          }

          Spacer(modifier = Modifier.height(4.dp))

          Row(
            verticalAlignment = Alignment.CenterVertically
          ) {
            Icon(
              imageVector = Icons.Default.LocationOn,
              contentDescription = null,
              tint = EarthBrownSecondary,
              modifier = Modifier.size(13.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
              text = "${produce.location} • ${produce.quantityAvailable.toInt()} ${produce.unit} harvested",
              color = EarthBrownWarm,
              fontSize = 11.sp,
              fontWeight = FontWeight.Medium
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(12.dp))

      // Direct Action Buttons: Contact Farmer & Direct Buy
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
      ) {
        // Direct Phone Call button
        OutlinedButton(
          onClick = {
            val intent = Intent(Intent.ACTION_DIAL).apply {
              data = Uri.parse("tel:${produce.farmerPhone.replace(" ", "")}")
            }
            context.startActivity(intent)
          },
          colors = ButtonDefaults.outlinedButtonColors(
            contentColor = EarthBrownSecondary
          ),
          border = BorderStroke(1.dp, EarthBrownSecondary),
          shape = RoundedCornerShape(10.dp),
          modifier = Modifier
            .weight(0.45f)
            .testTag("call_farmer_${produce.id}")
        ) {
          Icon(
            imageVector = Icons.Default.Call,
            contentDescription = "Call Farmer Directly",
            modifier = Modifier.size(16.dp)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "Call",
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
          )
        }

        // Direct Buy / Order Button
        Button(
          onClick = { onBuyClick(produce) },
          colors = ButtonDefaults.buttonColors(
            containerColor = DarkGreenPrimary
          ),
          shape = RoundedCornerShape(10.dp),
          modifier = Modifier
            .weight(0.55f)
            .testTag("buy_button_${produce.id}")
        ) {
          Icon(
            imageVector = Icons.Default.ShoppingBag,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(16.dp)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "Buy Direct",
            color = Color.White,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
          )
        }
      }
    }
  }
}
