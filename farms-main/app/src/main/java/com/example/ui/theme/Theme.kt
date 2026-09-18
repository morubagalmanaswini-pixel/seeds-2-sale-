package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
  primary = DarkGreenPrimary,
  onPrimary = Color.White,
  primaryContainer = DarkGreenContainer,
  onPrimaryContainer = OnDarkGreenContainer,
  secondary = EarthBrownSecondary,
  onSecondary = Color.White,
  secondaryContainer = EarthBrownContainer,
  onSecondaryContainer = OnEarthBrownContainer,
  tertiary = HarvestRedTertiary,
  onTertiary = Color.White,
  tertiaryContainer = HarvestRedContainer,
  onTertiaryContainer = OnHarvestRedContainer,
  background = FarmBackgroundLight,
  onBackground = FarmOnSurface,
  surface = FarmSurfaceLight,
  onSurface = FarmOnSurface,
  surfaceVariant = FarmSurfaceVariant,
  onSurfaceVariant = FarmOutline,
  outline = FarmOutline
)

private val DarkColorScheme = darkColorScheme(
  primary = DarkGreenPrimaryDark,
  onPrimary = Color(0xFF00391A),
  primaryContainer = DarkGreenContainerDark,
  onPrimaryContainer = Color(0xFF94F5B2),
  secondary = EarthBrownSecondaryDark,
  onSecondary = Color(0xFF3E2723),
  secondaryContainer = EarthBrownContainerDark,
  onSecondaryContainer = Color(0xFFEFEBE9),
  tertiary = HarvestRedTertiaryDark,
  onTertiary = Color(0xFF680003),
  tertiaryContainer = HarvestRedContainerDark,
  onTertiaryContainer = Color(0xFFFFDAD4),
  background = FarmBackgroundDark,
  onBackground = Color(0xFFE2E4DE),
  surface = FarmSurfaceDark,
  onSurface = Color(0xFFE2E4DE),
  surfaceVariant = Color(0xFF263328),
  onSurfaceVariant = Color(0xFFC3C9BC),
  outline = Color(0xFF8D9387)
)

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  dynamicColor: Boolean = false, // Keep custom requested Dark Green, Brown & Red theme
  content: @Composable () -> Unit,
) {
  val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

  MaterialTheme(
    colorScheme = colorScheme,
    typography = Typography,
    content = content
  )
}
