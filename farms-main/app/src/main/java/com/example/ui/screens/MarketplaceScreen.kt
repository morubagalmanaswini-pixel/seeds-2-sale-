package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Eco
import androidx.compose.material.icons.filled.Landscape
import androidx.compose.material.icons.filled.Laptop
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Yard
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.data.model.ProduceItem
import com.example.ui.components.ProduceCard
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

@Composable
fun MarketplaceScreen(
  produceList: List<ProduceItem>,
  selectedCategory: String,
  searchQuery: String,
  onCategorySelected: (String) -> Unit,
  onSearchQueryChanged: (String) -> Unit,
  onBuyProduceClick: (ProduceItem) -> Unit,
  modifier: Modifier = Modifier
) {
  val categories = listOf("All", "Vegetables", "Fruits", "Grains", "Pulses", "Dairy", "Honey")

  BoxWithConstraints(
    modifier = modifier
      .fillMaxSize()
      .background(Color(0xFFF7F8F4))
      .testTag("marketplace_screen")
  ) {
    // Determine laptop / widescreen adaptive columns
    val isWideScreen = maxWidth >= 600.dp
    val gridColumns = when {
      maxWidth >= 1000.dp -> 3
      maxWidth >= 600.dp -> 2
      else -> 1
    }

    LazyVerticalGrid(
      columns = GridCells.Fixed(gridColumns),
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 16.dp),
      verticalArrangement = Arrangement.spacedBy(14.dp),
      horizontalArrangement = Arrangement.spacedBy(14.dp),
      contentPadding = PaddingValues(top = 12.dp, bottom = 24.dp)
    ) {
      // Hero Banner with farm artwork & warm earth-brown tones
      item(span = { GridItemSpan(maxLineSpan) }) {
        Card(
          shape = RoundedCornerShape(16.dp),
          colors = CardDefaults.cardColors(containerColor = DarkGreenPrimary),
          elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
          border = BorderStroke(1.dp, EarthBrownBorder),
          modifier = Modifier.fillMaxWidth()
        ) {
          Box(modifier = Modifier.fillMaxWidth().height(if (isWideScreen) 160.dp else 140.dp)) {
            Image(
              painter = painterResource(id = R.drawable.farm_market_hero),
              contentDescription = "Fresh organic farm harvest",
              contentScale = ContentScale.Crop,
              modifier = Modifier.fillMaxSize()
            )

            // Dark Green and Earth Brown gradient overlay for rich contrast & readability
            Box(
              modifier = Modifier
                .fillMaxSize()
                .background(
                  Brush.horizontalGradient(
                    colors = listOf(
                      EarthBrownDeep.copy(alpha = 0.94f),
                      DarkGreenPrimary.copy(alpha = 0.85f),
                      Color.Transparent
                    )
                  )
                )
            )

            Column(
              modifier = Modifier
                .fillMaxSize()
                .padding(if (isWideScreen) 20.dp else 16.dp),
              verticalArrangement = Arrangement.Center
            ) {
              Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                  shape = RoundedCornerShape(20.dp),
                  color = HarvestRedTertiary
                ) {
                  Text(
                    text = "100% DIRECT FARM GATE",
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                  )
                }

                if (isWideScreen) {
                  Spacer(modifier = Modifier.width(8.dp))
                  Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = EarthBrownWarm
                  ) {
                    Text(
                      text = "WIDE-DESK VIEW",
                      color = Color.White,
                      fontSize = 10.sp,
                      fontWeight = FontWeight.Bold,
                      modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                  }
                }
              }

              Spacer(modifier = Modifier.height(6.dp))
              Text(
                text = "Skip the Middlemen.\nSupport Real Farmers.",
                color = Color.White,
                fontSize = if (isWideScreen) 20.sp else 17.sp,
                fontWeight = FontWeight.Bold,
                lineHeight = if (isWideScreen) 26.sp else 22.sp
              )
              Spacer(modifier = Modifier.height(3.dp))
              Text(
                text = "Direct from organic soil to your home • Save up to 50% on fresh produce",
                color = Color(0xFFD7CCC8),
                fontSize = 12.sp
              )
            }
          }
        }
      }

      // Soil & Earth Brown awareness banner
      item(span = { GridItemSpan(maxLineSpan) }) {
        Surface(
          shape = RoundedCornerShape(10.dp),
          color = EarthBrownSand,
          border = BorderStroke(1.dp, EarthBrownBorder),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Box(
                modifier = Modifier
                  .size(24.dp)
                  .clip(CircleShape)
                  .background(EarthBrownWarm),
                contentAlignment = Alignment.Center
              ) {
                Icon(
                  imageVector = Icons.Default.Yard,
                  contentDescription = null,
                  tint = Color.White,
                  modifier = Modifier.size(15.dp)
                )
              }
              Spacer(modifier = Modifier.width(8.dp))
              Text(
                text = "Fertile Soil to Kitchen Table: zero brokers, zero mandi commissions",
                color = EarthBrownDark,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
              )
            }

            Text(
              text = "100% Fair Trade",
              color = EarthBrownWarm,
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold
            )
          }
        }
      }

      // Search bar styled with rich Earth Brown border & icons
      item(span = { GridItemSpan(maxLineSpan) }) {
        OutlinedTextField(
          value = searchQuery,
          onValueChange = onSearchQueryChanged,
          placeholder = { Text("Search tomatoes, wheat, mangoes, farms...", fontSize = 13.sp) },
          leadingIcon = {
            Icon(
              imageVector = Icons.Default.Search,
              contentDescription = "Search",
              tint = EarthBrownWarm
            )
          },
          trailingIcon = {
            if (searchQuery.isNotBlank()) {
              IconButton(onClick = { onSearchQueryChanged("") }) {
                Icon(Icons.Default.Close, contentDescription = "Clear search", tint = EarthBrownWarm)
              }
            }
          },
          singleLine = true,
          shape = RoundedCornerShape(12.dp),
          colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = Color.White,
            unfocusedContainerColor = Color.White,
            focusedBorderColor = EarthBrownWarm,
            unfocusedBorderColor = EarthBrownBorder
          ),
          modifier = Modifier
            .fillMaxWidth()
            .testTag("search_bar")
        )
      }

      // Category Filter Chips with Earth Brown styling
      item(span = { GridItemSpan(maxLineSpan) }) {
        LazyRow(
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          modifier = Modifier.fillMaxWidth()
        ) {
          items(categories) { category ->
            val isSelected = selectedCategory.equals(category, ignoreCase = true)
            val bg = if (isSelected) DarkGreenPrimary else EarthBrownSand
            val textColor = if (isSelected) Color.White else EarthBrownDark
            val border = if (isSelected) BorderStroke(1.dp, DarkGreenDark) else BorderStroke(1.dp, EarthBrownBorder)

            Surface(
              shape = RoundedCornerShape(20.dp),
              color = bg,
              border = border,
              modifier = Modifier
                .clip(RoundedCornerShape(20.dp))
                .clickable { onCategorySelected(category) }
                .testTag("category_chip_$category")
            ) {
              Text(
                text = category,
                color = textColor,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
              )
            }
          }
        }
      }

      // Count of available listings
      item(span = { GridItemSpan(maxLineSpan) }) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
              text = "Direct Farm Listings (${produceList.size})",
              fontSize = 15.sp,
              fontWeight = FontWeight.Bold,
              color = DarkGreenDark
            )
            if (isWideScreen) {
              Spacer(modifier = Modifier.width(8.dp))
              Text(
                text = "• $gridColumns column layout",
                fontSize = 12.sp,
                color = EarthBrownWarm
              )
            }
          }

          Text(
            text = "Direct rates • No commission",
            fontSize = 11.sp,
            color = EarthBrownSecondary,
            fontWeight = FontWeight.Medium
          )
        }
      }

      // Produce list items (displayed in 1 column on phone, 2 or 3 columns on laptop view)
      if (produceList.isEmpty()) {
        item(span = { GridItemSpan(maxLineSpan) }) {
          Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            border = BorderStroke(1.dp, EarthBrownBorder),
            modifier = Modifier.fillMaxWidth()
          ) {
            Box(
              modifier = Modifier
                .fillMaxWidth()
                .padding(32.dp),
              contentAlignment = Alignment.Center
            ) {
              Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                  imageVector = Icons.Default.Eco,
                  contentDescription = null,
                  tint = EarthBrownWarm,
                  modifier = Modifier.size(48.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                  text = "No produce found for \"$searchQuery\"",
                  fontSize = 15.sp,
                  fontWeight = FontWeight.SemiBold,
                  color = EarthBrownDark
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                  text = "Try clearing filters or search for another harvest item",
                  fontSize = 12.sp,
                  color = Color.Gray
                )
              }
            }
          }
        }
      } else {
        items(produceList, key = { it.id }) { produce ->
          ProduceCard(
            produce = produce,
            onBuyClick = onBuyProduceClick
          )
        }
      }
    }
  }
}
