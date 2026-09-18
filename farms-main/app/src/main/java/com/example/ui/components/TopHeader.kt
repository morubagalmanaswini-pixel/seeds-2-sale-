package com.example.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.filled.Agriculture
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.TrendingDown
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.UserRole
import com.example.ui.theme.DarkGreenPrimary
import com.example.ui.theme.EarthBrownDark
import com.example.ui.theme.EarthBrownSecondary
import com.example.ui.theme.HarvestRedTertiary

@Composable
fun TopHeader(
  userRole: UserRole,
  onRoleChange: (UserRole) -> Unit,
  modifier: Modifier = Modifier
) {
  Surface(
    color = DarkGreenPrimary,
    tonalElevation = 4.dp,
    modifier = modifier.fillMaxWidth()
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
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
              .background(HarvestRedTertiary),
            contentAlignment = Alignment.Center
          ) {
            Icon(
              imageVector = Icons.Default.Eco,
              contentDescription = "FarmDirect Logo",
              tint = Color.White,
              modifier = Modifier.size(24.dp)
            )
          }
          Spacer(modifier = Modifier.width(10.dp))
          Column {
            Text(
              text = "FarmDirect",
              color = Color.White,
              fontSize = 20.sp,
              fontWeight = FontWeight.Bold
            )
            Text(
              text = "Direct From Fields • Zero Middlemen",
              color = Color(0xFFD4EED8),
              fontSize = 11.sp,
              fontWeight = FontWeight.Medium
            )
          }
        }

        // Role Switcher Pill (Consumer vs Farmer)
        Row(
          modifier = Modifier
            .clip(RoundedCornerShape(24.dp))
            .background(EarthBrownDark)
            .padding(3.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          val consumerBg by animateColorAsState(
            targetValue = if (userRole == UserRole.CONSUMER) HarvestRedTertiary else Color.Transparent,
            label = "consumerBg"
          )
          val farmerBg by animateColorAsState(
            targetValue = if (userRole == UserRole.FARMER) EarthBrownSecondary else Color.Transparent,
            label = "farmerBg"
          )

          Box(
            modifier = Modifier
              .clip(RoundedCornerShape(20.dp))
              .background(consumerBg)
              .clickable { onRoleChange(UserRole.CONSUMER) }
              .padding(horizontal = 10.dp, vertical = 6.dp)
              .testTag("role_consumer_tab"),
            contentAlignment = Alignment.Center
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(
                imageVector = Icons.Default.ShoppingBag,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(14.dp)
              )
              Spacer(modifier = Modifier.width(4.dp))
              Text(
                text = "Consumer",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = if (userRole == UserRole.CONSUMER) FontWeight.Bold else FontWeight.Normal
              )
            }
          }

          Box(
            modifier = Modifier
              .clip(RoundedCornerShape(20.dp))
              .background(farmerBg)
              .clickable { onRoleChange(UserRole.FARMER) }
              .padding(horizontal = 10.dp, vertical = 6.dp)
              .testTag("role_farmer_tab"),
            contentAlignment = Alignment.Center
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Icon(
                imageVector = Icons.Default.Agriculture,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(14.dp)
              )
              Spacer(modifier = Modifier.width(4.dp))
              Text(
                text = "Farmer",
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = if (userRole == UserRole.FARMER) FontWeight.Bold else FontWeight.Normal
              )
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(8.dp))

      // Middleman cut eliminated badge strip
      Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF143D21),
        modifier = Modifier.fillMaxWidth()
      ) {
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 10.dp, vertical = 6.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.SpaceBetween
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
              imageVector = Icons.Default.TrendingDown,
              contentDescription = null,
              tint = HarvestRedTertiary,
              modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
              text = "Middlemen Markup: Slashed 100%",
              color = Color(0xFFF0FDF4),
              fontSize = 11.sp,
              fontWeight = FontWeight.SemiBold
            )
          }

          Text(
            text = "Farmer gets full price",
            color = Color(0xFFD7CCC8),
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium
          )
        }
      }
    }
  }
}
