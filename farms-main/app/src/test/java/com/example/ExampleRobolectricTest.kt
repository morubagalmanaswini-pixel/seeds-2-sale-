package com.example

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.data.model.ProduceItem
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

  @Test
  fun `read string from context`() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val appName = context.getString(R.string.app_name)
    assertEquals("FarmDirect", appName)
  }

  @Test
  fun `verify middleman savings calculation`() {
    val produce = ProduceItem(
      name = "Organic Vine Tomatoes",
      category = "Vegetables",
      farmPrice = 20.0,
      middlemanPrice = 40.0,
      unit = "kg",
      quantityAvailable = 100.0,
      farmerName = "Ramesh Patel",
      farmName = "Green Valley Farm",
      farmerPhone = "+91 98765 43210",
      location = "Pune",
      isOrganic = true,
      harvestDate = "Today",
      description = "Fresh"
    )

    assertEquals(20.0, produce.savingsPerUnit, 0.01)
    assertEquals(50, produce.savingsPercentage)
  }
}
