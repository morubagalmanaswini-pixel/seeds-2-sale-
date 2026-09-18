package com.example.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import com.example.data.dao.OrderDao
import com.example.data.dao.ProduceDao
import com.example.data.model.Order
import com.example.data.model.ProduceItem
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

@Database(entities = [ProduceItem::class, Order::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
  abstract fun produceDao(): ProduceDao
  abstract fun orderDao(): OrderDao

  companion object {
    @Volatile
    private var INSTANCE: AppDatabase? = null

    fun getDatabase(context: Context, scope: CoroutineScope): AppDatabase {
      return INSTANCE ?: synchronized(this) {
        val instance = Room.databaseBuilder(
          context.applicationContext,
          AppDatabase::class.java,
          "farm_direct_db"
        )
          .addCallback(DatabaseCallback(scope))
          .build()
        INSTANCE = instance
        instance
      }
    }

    private class DatabaseCallback(
      private val scope: CoroutineScope
    ) : RoomDatabase.Callback() {
      override fun onCreate(db: SupportSQLiteDatabase) {
        super.onCreate(db)
        INSTANCE?.let { database ->
          scope.launch(Dispatchers.IO) {
            populateInitialProduce(database.produceDao())
          }
        }
      }
    }

    suspend fun populateInitialProduce(produceDao: ProduceDao) {
      if (produceDao.getCount() > 0) return

      val initialProduce = listOf(
        ProduceItem(
          name = "Organic Vine Tomatoes",
          category = "Vegetables",
          farmPrice = 22.0,
          middlemanPrice = 45.0,
          unit = "kg",
          quantityAvailable = 150.0,
          farmerName = "Ramesh Patel",
          farmName = "Green Valley Organic Farm",
          farmerPhone = "+91 98765 43210",
          location = "Pune District, Maharashtra",
          isOrganic = true,
          harvestDate = "Harvested Today",
          description = "Naturally sun-ripened red juicy tomatoes picked fresh at dawn. Zero synthetic pesticides."
        ),
        ProduceItem(
          name = "Farm Fresh Potatoes (Jyoti)",
          category = "Vegetables",
          farmPrice = 18.0,
          middlemanPrice = 32.0,
          unit = "kg",
          quantityAvailable = 400.0,
          farmerName = "Gurpreet Singh",
          farmName = "Golden Fields Agro",
          farmerPhone = "+91 98123 45678",
          location = "Jalandhar, Punjab",
          isOrganic = false,
          harvestDate = "2 days ago",
          description = "Firm, soil-dusted fresh tubers direct from harvest. Perfect for boiling and roasting."
        ),
        ProduceItem(
          name = "Natural Alphonso Mangoes",
          category = "Fruits",
          farmPrice = 450.0,
          middlemanPrice = 850.0,
          unit = "dozen",
          quantityAvailable = 45.0,
          farmerName = "Subhash Sawant",
          farmName = "Konkan Heritage Orchards",
          farmerPhone = "+91 94220 11223",
          location = "Ratnagiri, Maharashtra",
          isOrganic = true,
          harvestDate = "Freshly Picked",
          description = "Hand-plucked GI-tagged Devgad Alphonso mangoes. Naturally straw-ripened with intense sweetness."
        ),
        ProduceItem(
          name = "Crisp Shimla Apples",
          category = "Fruits",
          farmPrice = 90.0,
          middlemanPrice = 160.0,
          unit = "kg",
          quantityAvailable = 200.0,
          farmerName = "Tara Chand Verma",
          farmName = "Himalayan Breeze Orchard",
          farmerPhone = "+91 98055 88990",
          location = "Kotgarh, Himachal Pradesh",
          isOrganic = true,
          harvestDate = "3 days ago",
          description = "High-altitude mountain apples with crisp bite and sweet-tart crunch. Straight from tree to crate."
        ),
        ProduceItem(
          name = "Sharbati Golden Wheat Grain",
          category = "Grains",
          farmPrice = 38.0,
          middlemanPrice = 65.0,
          unit = "kg",
          quantityAvailable = 1000.0,
          farmerName = "Balram Chouhan",
          farmName = "Narmada Soil Agro",
          farmerPhone = "+91 97551 23456",
          location = "Sehore, Madhya Pradesh",
          isOrganic = true,
          harvestDate = "Recent Harvest",
          description = "Unpolished, heavy grain rich in protein. Yields soft, sweet rotis. Direct from MP fields."
        ),
        ProduceItem(
          name = "Organic Desi Toor Dal (Pigeon Pea)",
          category = "Pulses",
          farmPrice = 120.0,
          middlemanPrice = 195.0,
          unit = "kg",
          quantityAvailable = 350.0,
          farmerName = "Anasuya Devi",
          farmName = "Gramodaya Women Farmers Co-op",
          farmerPhone = "+91 99887 66554",
          location = "Gulbarga, Karnataka",
          isOrganic = true,
          harvestDate = "Sun Dried Last Week",
          description = "Unpolished native yellow lentils. High protein, cooks quickly with authentic earthy aroma."
        ),
        ProduceItem(
          name = "Pure Wild Forest Honey",
          category = "Honey",
          farmPrice = 340.0,
          middlemanPrice = 580.0,
          unit = "kg",
          quantityAvailable = 60.0,
          farmerName = "Bhimrao Korva",
          farmName = "Satpura Tribal Bio-Reserve",
          farmerPhone = "+91 94066 77889",
          location = "Hoshangabad, Madhya Pradesh",
          isOrganic = true,
          harvestDate = "Raw Unfiltered",
          description = "100% raw multi-flora forest honey collected by local beekeepers. No sugar syrup adulteration."
        ),
        ProduceItem(
          name = "Fresh A2 Gir Cow Milk",
          category = "Dairy",
          farmPrice = 60.0,
          middlemanPrice = 90.0,
          unit = "litre",
          quantityAvailable = 80.0,
          farmerName = "Devendra Joshi",
          farmName = "Gokul Desi Gaushala",
          farmerPhone = "+91 98250 33445",
          location = "Anand, Gujarat",
          isOrganic = true,
          harvestDate = "Fresh Morning Batch",
          description = "Pure, unadulterated grass-fed indigenous Gir cow milk. Rich in natural nutrients and healthy fat."
        )
      )
      produceDao.insertAll(initialProduce)
    }
  }
}
