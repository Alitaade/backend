import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { query } from "./connection";
import { initializeSchema } from "./schema";

// Function to seed admin user
const seedAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    // Check if admin already exists
    const existingAdmin = await query("SELECT * FROM users WHERE email = $1", [
      adminEmail,
    ]);

    if (existingAdmin.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      await query(
        "INSERT INTO users (email, password, first_name, last_name, is_admin) VALUES ($1, $2, $3, $4, $5)",
        [adminEmail, hashedPassword, "Admin", "User", true]
      );

      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
};

// Function to seed categories
const seedCategories = async () => {
  try {
    const categories = [
      { name: "Tops", description: "T-shirts, blouses, and shirts" },
      { name: "Bottoms", description: "Pants, shorts, and skirts" },
      { name: "Dresses", description: "All types of dresses" },
      { name: "Outerwear", description: "Jackets, coats, and sweaters" },
      { name: "Accessories", description: "Hats, scarves, and jewelry" },
      { name: "Footwear", description: "Shoes, boots, and sandals" },
    ];

    for (const category of categories) {
      const existingCategory = await query(
        "SELECT * FROM categories WHERE name = $1",
        [category.name]
      );

      if (existingCategory.rows.length === 0) {
        await query(
          "INSERT INTO categories (name, description) VALUES ($1, $2)",
          [category.name, category.description]
        );
      }
    }

    console.log("Categories seeded successfully");
  } catch (error) {
    console.error("Error seeding categories:", error);
  }
};

// Update the seedProducts function to use real image URLs and consistent dimensions
const seedProducts = async () => {
  try {
    // Get category IDs
    const categoriesResult = await query("SELECT id, name FROM categories");
    const categories = categoriesResult.rows;

    const categoryMap: Record<string, number> = {};
    categories.forEach((cat) => {
      categoryMap[cat.name] = cat.id;
    });

    // Default image dimensions for product images
    const DEFAULT_WIDTH = 1200;
    const DEFAULT_HEIGHT = 1600;

    const products = [
      // TOPS CATEGORY - 20 products
      {
        name: "Classic White T-Shirt",
        description:
          "A comfortable, everyday white t-shirt made from 100% cotton.",
        price: 19.99,
        category: "Tops",
        stock_quantity: 100,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of classic white t-shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1622445275576-721325763afe?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of classic white t-shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of classic white t-shirt",
          },
        ],
      },
      {
        name: "Striped Polo Shirt",
        description:
          "Classic striped polo shirt with a comfortable fit and breathable fabric.",
        price: 29.99,
        category: "Tops",
        stock_quantity: 85,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of striped polo shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1571455786673-9d9d6c194f90?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of striped polo shirt",
          },
        ],
      },
      {
        name: "Button-Down Oxford Shirt",
        description:
          "Classic oxford button-down shirt perfect for casual or formal occasions.",
        price: 39.99,
        category: "Tops",
        stock_quantity: 70,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of oxford shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail view of oxford shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1598961942613-ba897716405b?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of oxford shirt",
          },
        ],
      },
      {
        name: "Graphic Print T-Shirt",
        description:
          "Bold graphic print t-shirt with artistic design on premium cotton.",
        price: 24.99,
        category: "Tops",
        stock_quantity: 90,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of graphic print t-shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Close-up of graphic print t-shirt design",
          },
        ],
      },
      {
        name: "Henley Long Sleeve Shirt",
        description:
          "Comfortable henley shirt with button placket and long sleeves.",
        price: 34.99,
        category: "Tops",
        stock_quantity: 65,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of henley long sleeve shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of henley long sleeve shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of henley shirt buttons",
          },
        ],
      },
      {
        name: "V-Neck Sweater",
        description: "Soft v-neck sweater made from premium wool blend.",
        price: 49.99,
        category: "Tops",
        stock_quantity: 55,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1614975059251-992f11792b9f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of v-neck sweater",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Close-up of v-neck sweater fabric",
          },
        ],
      },
      {
        name: "Casual Linen Shirt",
        description: "Breathable linen shirt perfect for warm weather.",
        price: 44.99,
        category: "Tops",
        stock_quantity: 60,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1626497764746-6dc36546b388?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of linen shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1604695573706-53170668f6a6?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of linen shirt texture",
          },
          {
            url: "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of linen shirt",
          },
        ],
      },
      {
        name: "Turtleneck Sweater",
        description: "Cozy turtleneck sweater for cold weather comfort.",
        price: 54.99,
        category: "Tops",
        stock_quantity: 50,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of turtleneck sweater",
          },
          {
            url: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Close-up of turtleneck detail",
          },
        ],
      },
      {
        name: "Sleeveless Blouse",
        description: "Elegant sleeveless blouse with a flowing silhouette.",
        price: 32.99,
        category: "Tops",
        stock_quantity: 75,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551489186-cf8726f514f8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of sleeveless blouse",
          },
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of sleeveless blouse",
          },
        ],
      },
      {
        name: "Crop Top",
        description: "Trendy crop top with a modern fit and style.",
        price: 22.99,
        category: "Tops",
        stock_quantity: 85,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of crop top",
          },
          {
            url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of crop top",
          },
          {
            url: "https://images.unsplash.com/photo-1554568218-0f1715e72254?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of crop top",
          },
        ],
      },
      {
        name: "Flannel Shirt",
        description: "Classic plaid flannel shirt for a rustic, casual look.",
        price: 37.99,
        category: "Tops",
        stock_quantity: 70,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of flannel shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1643297654416-05795d62e9f8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of flannel pattern",
          },
        ],
      },
      {
        name: "Silk Blouse",
        description:
          "Luxurious silk blouse with a smooth finish and elegant drape.",
        price: 69.99,
        category: "Tops",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of silk blouse",
          },
          {
            url: "https://images.unsplash.com/photo-1551489186-cf8726f514f8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of silk fabric",
          },
          {
            url: "https://images.unsplash.com/photo-1554568218-0f1715e72254?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of silk blouse",
          },
        ],
      },
      {
        name: "Raglan Baseball Tee",
        description:
          "Classic raglan sleeve baseball tee with contrasting sleeves.",
        price: 27.99,
        category: "Tops",
        stock_quantity: 80,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of raglan baseball tee",
          },
          {
            url: "https://images.unsplash.com/photo-1622445275576-721325763afe?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view showing raglan sleeve",
          },
        ],
      },
      {
        name: "Thermal Henley",
        description:
          "Warm thermal henley shirt with waffle texture for extra insulation.",
        price: 32.99,
        category: "Tops",
        stock_quantity: 65,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of thermal henley",
          },
          {
            url: "https://images.unsplash.com/photo-1588359348347-9bc6cbbb689e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Close-up of thermal fabric texture",
          },
          {
            url: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of henley buttons",
          },
        ],
      },
      {
        name: "Peplum Top",
        description: "Stylish peplum top with a flattering silhouette.",
        price: 36.99,
        category: "Tops",
        stock_quantity: 55,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551489186-cf8726f514f8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of peplum top",
          },
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view showing peplum detail",
          },
        ],
      },
      {
        name: "Off-Shoulder Blouse",
        description: "Elegant off-shoulder blouse with a romantic feel.",
        price: 38.99,
        category: "Tops",
        stock_quantity: 60,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of off-shoulder blouse",
          },
          {
            url: "https://images.unsplash.com/photo-1551489186-cf8726f514f8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of off-shoulder blouse",
          },
          {
            url: "https://images.unsplash.com/photo-1554568218-0f1715e72254?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of off-shoulder blouse",
          },
        ],
      },
      {
        name: "Muscle Tank",
        description:
          "Athletic muscle tank with a modern cut for workouts or casual wear.",
        price: 24.99,
        category: "Tops",
        stock_quantity: 75,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of muscle tank",
          },
          {
            url: "https://images.unsplash.com/photo-1622445275576-721325763afe?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of muscle tank",
          },
        ],
      },
      {
        name: "Cashmere Sweater",
        description:
          "Luxurious cashmere sweater with incredible softness and warmth.",
        price: 129.99,
        category: "Tops",
        stock_quantity: 35,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1614975059251-992f11792b9f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of cashmere sweater",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Close-up of cashmere fabric",
          },
          {
            url: "https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of cashmere sweater",
          },
        ],
      },
      {
        name: "Denim Shirt",
        description:
          "Classic denim shirt with a timeless look and durable construction.",
        price: 45.99,
        category: "Tops",
        stock_quantity: 60,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of denim shirt",
          },
          {
            url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of denim texture",
          },
          {
            url: "https://images.unsplash.com/photo-1598961942613-ba897716405b?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of denim shirt",
          },
        ],
      },
      {
        name: "Tie-Front Blouse",
        description: "Stylish tie-front blouse with a feminine touch.",
        price: 34.99,
        category: "Tops",
        stock_quantity: 55,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551489186-cf8726f514f8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of tie-front blouse",
          },
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of tie-front feature",
          },
        ],
      },

      // BOTTOMS CATEGORY - 20 products
      {
        name: "Slim Fit Jeans",
        description: "Modern slim fit jeans with a slight stretch for comfort.",
        price: 49.99,
        category: "Bottoms",
        stock_quantity: 75,
        sizes: ["28", "30", "32", "34", "36"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of slim fit jeans",
          },
          {
            url: "https://images.unsplash.com/photo-1555689502-c4b22d76c56f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of slim fit jeans",
          },
        ],
      },
      {
        name: "Chino Pants",
        description:
          "Classic chino pants with a comfortable fit and versatile style.",
        price: 44.99,
        category: "Bottoms",
        stock_quantity: 70,
        sizes: ["28", "30", "32", "34", "36", "38"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of chino pants",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of chino fabric",
          },
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of chino pants",
          },
        ],
      },
      {
        name: "Cargo Shorts",
        description:
          "Durable cargo shorts with multiple pockets for functionality.",
        price: 34.99,
        category: "Bottoms",
        stock_quantity: 85,
        sizes: ["28", "30", "32", "34", "36", "38"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of cargo shorts",
          },
          {
            url: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of cargo shorts with pocket detail",
          },
        ],
      },
      {
        name: "Pleated Skirt",
        description:
          "Elegant pleated skirt with a flowing silhouette and comfortable fit.",
        price: 39.99,
        category: "Bottoms",
        stock_quantity: 60,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of pleated skirt",
          },
          {
            url: "https://images.unsplash.com/photo-1551163943-3f7fb896e0f3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of pleats",
          },
          {
            url: "https://images.unsplash.com/photo-1551489186-cf8726f514f8?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of pleated skirt",
          },
        ],
      },
      {
        name: "Straight Leg Pants",
        description: "Classic straight leg pants with a timeless silhouette.",
        price: 47.99,
        category: "Bottoms",
        stock_quantity: 65,
        sizes: ["28", "30", "32", "34", "36"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of straight leg pants",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of pants fabric",
          },
        ],
      },
      {
        name: "Denim Shorts",
        description:
          "Classic denim shorts with a comfortable fit and versatile style.",
        price: 32.99,
        category: "Bottoms",
        stock_quantity: 90,
        sizes: ["28", "30", "32", "34", "36"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of denim shorts",
          },
          {
            url: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of denim shorts",
          },
          {
            url: "https://images.unsplash.com/photo-1555689502-c4b22d76c56f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of denim shorts",
          },
        ],
      },
      {
        name: "Wide Leg Trousers",
        description: "Stylish wide leg trousers with a flowing silhouette.",
        price: 54.99,
        category: "Bottoms",
        stock_quantity: 55,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of wide leg trousers",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of trouser fabric",
          },
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view showing wide leg silhouette",
          },
        ],
      },
      {
        name: "Pencil Skirt",
        description: "Classic pencil skirt with a sleek, professional look.",
        price: 42.99,
        category: "Bottoms",
        stock_quantity: 60,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of pencil skirt",
          },
          {
            url: "https://images.unsplash.com/photo-1551163943-3f7fb896e0f3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of pencil skirt",
          },
        ],
      },
      {
        name: "Jogger Pants",
        description:
          "Comfortable jogger pants with elastic cuffs and drawstring waist.",
        price: 37.99,
        category: "Bottoms",
        stock_quantity: 85,
        sizes: ["XS", "S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of jogger pants",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of elastic cuff",
          },
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of jogger pants",
          },
        ],
      },
      {
        name: "Bermuda Shorts",
        description: "Longer length bermuda shorts with a comfortable fit.",
        price: 36.99,
        category: "Bottoms",
        stock_quantity: 70,
        sizes: ["28", "30", "32", "34", "36"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of bermuda shorts",
          },
          {
            url: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of bermuda shorts",
          },
        ],
      },
      {
        name: "Leather Pants",
        description: "Stylish leather pants with a sleek, modern look.",
        price: 89.99,
        category: "Bottoms",
        stock_quantity: 40,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of leather pants",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of leather texture",
          },
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of leather pants",
          },
        ],
      },
      {
        name: "A-Line Skirt",
        description: "Classic A-line skirt with a flattering silhouette.",
        price: 38.99,
        category: "Bottoms",
        stock_quantity: 65,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of A-line skirt",
          },
          {
            url: "https://images.unsplash.com/photo-1551163943-3f7fb896e0f3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view showing A-line silhouette",
          },
        ],
      },
      {
        name: "Distressed Jeans",
        description: "Trendy distressed jeans with a modern, edgy look.",
        price: 54.99,
        category: "Bottoms",
        stock_quantity: 70,
        sizes: ["28", "30", "32", "34", "36"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of distressed jeans",
          },
          {
            url: "https://images.unsplash.com/photo-1555689502-c4b22d76c56f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of distressed areas",
          },
          {
            url: "https://images.unsplash.com/photo-1604176424472-9d7122c67c3c?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of distressed jeans",
          },
        ],
      },
      {
        name: "Linen Pants",
        description: "Breathable linen pants perfect for warm weather.",
        price: 49.99,
        category: "Bottoms",
        stock_quantity: 60,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of linen pants",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of linen fabric texture",
          },
        ],
      },
      {
        name: "Denim Skirt",
        description: "Classic denim skirt with a versatile, timeless style.",
        price: 36.99,
        category: "Bottoms",
        stock_quantity: 75,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of denim skirt",
          },
          {
            url: "https://images.unsplash.com/photo-1551163943-3f7fb896e0f3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of denim skirt",
          },
          {
            url: "https://images.unsplash.com/photo-1555689502-c4b22d76c56f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of denim texture",
          },
        ],
      },
      {
        name: "Corduroy Pants",
        description:
          "Classic corduroy pants with a soft texture and warm feel.",
        price: 52.99,
        category: "Bottoms",
        stock_quantity: 55,
        sizes: ["28", "30", "32", "34", "36"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of corduroy pants",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of corduroy texture",
          },
        ],
      },
      {
        name: "Athletic Shorts",
        description:
          "Lightweight athletic shorts with moisture-wicking fabric.",
        price: 29.99,
        category: "Bottoms",
        stock_quantity: 90,
        sizes: ["XS", "S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1565084888279-aca607ecce0c?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of athletic shorts",
          },
          {
            url: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of athletic shorts",
          },
        ],
      },
      {
        name: "Palazzo Pants",
        description:
          "Flowing palazzo pants with a wide leg and comfortable fit.",
        price: 46.99,
        category: "Bottoms",
        stock_quantity: 60,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of palazzo pants",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of flowing fabric",
          },
          {
            url: "https://images.unsplash.com/photo-1552902019-ebcd97aa9aa0?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view showing wide leg silhouette",
          },
        ],
      },
      {
        name: "Cargo Pants",
        description:
          "Durable cargo pants with multiple pockets for functionality.",
        price: 49.99,
        category: "Bottoms",
        stock_quantity: 70,
        sizes: ["28", "30", "32", "34", "36", "38"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of cargo pants",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of cargo pockets",
          },
        ],
      },
      {
        name: "Midi Skirt",
        description:
          "Elegant midi skirt with a flattering length and silhouette.",
        price: 43.99,
        category: "Bottoms",
        stock_quantity: 65,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of midi skirt",
          },
          {
            url: "https://images.unsplash.com/photo-1551163943-3f7fb896e0f3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of midi skirt",
          },
        ],
      },

      // DRESSES CATEGORY - 20 products
      {
        name: "Floral Summer Dress",
        description: "Light and airy floral dress, perfect for summer days.",
        price: 59.99,
        category: "Dresses",
        stock_quantity: 50,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of floral summer dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of floral summer dress",
          },
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of floral summer dress",
          },
        ],
      },
      {
        name: "Cocktail Dress",
        description:
          "Elegant cocktail dress for special occasions and evening events.",
        price: 79.99,
        category: "Dresses",
        stock_quantity: 40,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of cocktail dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of cocktail dress",
          },
        ],
      },
      {
        name: "Maxi Dress",
        description: "Flowing maxi dress with a floor-length silhouette.",
        price: 64.99,
        category: "Dresses",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of maxi dress",
          },
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of maxi dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of maxi dress",
          },
        ],
      },
      {
        name: "Wrap Dress",
        description: "Flattering wrap dress with an adjustable fit.",
        price: 54.99,
        category: "Dresses",
        stock_quantity: 55,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of wrap dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of wrap closure",
          },
        ],
      },
      {
        name: "Shift Dress",
        description: "Classic shift dress with a simple, elegant silhouette.",
        price: 49.99,
        category: "Dresses",
        stock_quantity: 60,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of shift dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of shift dress",
          },
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of shift dress",
          },
        ],
      },
      {
        name: "Bodycon Dress",
        description: "Figure-hugging bodycon dress with a sleek silhouette.",
        price: 52.99,
        category: "Dresses",
        stock_quantity: 50,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of bodycon dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of bodycon dress",
          },
        ],
      },
      {
        name: "Sundress",
        description: "Light and breezy sundress perfect for warm days.",
        price: 44.99,
        category: "Dresses",
        stock_quantity: 65,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of sundress",
          },
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of sundress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of sundress",
          },
        ],
      },
      {
        name: "A-Line Dress",
        description: "Classic A-line dress with a flattering silhouette.",
        price: 57.99,
        category: "Dresses",
        stock_quantity: 55,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of A-line dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view showing A-line silhouette",
          },
        ],
      },
      {
        name: "Sweater Dress",
        description:
          "Cozy sweater dress for comfortable, stylish cold-weather wear.",
        price: 59.99,
        category: "Dresses",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of sweater dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of sweater fabric",
          },
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of sweater dress",
          },
        ],
      },
      {
        name: "Shirt Dress",
        description:
          "Classic shirt dress with button-front closure and collar.",
        price: 49.99,
        category: "Dresses",
        stock_quantity: 60,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of shirt dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of button closure",
          },
        ],
      },
      {
        name: "Off-Shoulder Dress",
        description: "Elegant off-shoulder dress with a romantic silhouette.",
        price: 62.99,
        category: "Dresses",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of off-shoulder dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of off-shoulder neckline",
          },
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of off-shoulder dress",
          },
        ],
      },
      {
        name: "Slip Dress",
        description:
          "Sleek slip dress with a minimalist design and elegant drape.",
        price: 47.99,
        category: "Dresses",
        stock_quantity: 50,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of slip dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of slip dress",
          },
        ],
      },
      {
        name: "Halter Dress",
        description: "Stylish halter dress with a flattering neckline.",
        price: 53.99,
        category: "Dresses",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of halter dress",
          },
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of halter dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of halter neckline",
          },
        ],
      },
      {
        name: "Midi Dress",
        description: "Elegant midi dress with a flattering mid-calf length.",
        price: 58.99,
        category: "Dresses",
        stock_quantity: 55,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of midi dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of midi dress",
          },
        ],
      },
      {
        name: "Peplum Dress",
        description: "Stylish peplum dress with a flattering waistline detail.",
        price: 56.99,
        category: "Dresses",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of peplum dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of peplum waistline",
          },
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of peplum dress",
          },
        ],
      },
      {
        name: "Lace Dress",
        description: "Elegant lace dress with intricate detailing.",
        price: 69.99,
        category: "Dresses",
        stock_quantity: 40,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of lace dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of lace pattern",
          },
        ],
      },
      {
        name: "Denim Dress",
        description:
          "Casual denim dress with a relaxed fit and timeless style.",
        price: 54.99,
        category: "Dresses",
        stock_quantity: 55,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of denim dress",
          },
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of denim dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of denim texture",
          },
        ],
      },
      {
        name: "Strapless Dress",
        description: "Elegant strapless dress with a secure, comfortable fit.",
        price: 64.99,
        category: "Dresses",
        stock_quantity: 40,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of strapless dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of strapless dress",
          },
        ],
      },
      {
        name: "Pleated Dress",
        description: "Elegant pleated dress with a flowing silhouette.",
        price: 59.99,
        category: "Dresses",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of pleated dress",
          },
          {
            url: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of pleats",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of pleated dress",
          },
        ],
      },
      {
        name: "Empire Waist Dress",
        description: "Flattering empire waist dress with a raised waistline.",
        price: 57.99,
        category: "Dresses",
        stock_quantity: 50,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of empire waist dress",
          },
          {
            url: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of empire waistline",
          },
        ],
      },

      // OUTERWEAR CATEGORY - 20 products
      {
        name: "Leather Jacket",
        description: "Classic leather jacket with a modern twist.",
        price: 199.99,
        category: "Outerwear",
        stock_quantity: 25,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of leather jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of leather jacket",
          },
        ],
      },
      {
        name: "Denim Jacket",
        description: "Classic denim jacket with a timeless design.",
        price: 69.99,
        category: "Outerwear",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of denim jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of denim jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of denim texture",
          },
        ],
      },
      {
        name: "Puffer Jacket",
        description: "Warm puffer jacket with insulation for cold weather.",
        price: 89.99,
        category: "Outerwear",
        stock_quantity: 35,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of puffer jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of puffer jacket",
          },
        ],
      },
      {
        name: "Trench Coat",
        description:
          "Classic trench coat with a timeless design and water-resistant fabric.",
        price: 129.99,
        category: "Outerwear",
        stock_quantity: 30,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of trench coat",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of trench coat",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of belt and buttons",
          },
        ],
      },
      {
        name: "Wool Peacoat",
        description: "Classic wool peacoat with a warm, structured design.",
        price: 149.99,
        category: "Outerwear",
        stock_quantity: 25,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of wool peacoat",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of wool peacoat",
          },
        ],
      },
      {
        name: "Bomber Jacket",
        description: "Classic bomber jacket with ribbed cuffs and hem.",
        price: 79.99,
        category: "Outerwear",
        stock_quantity: 40,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of bomber jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of bomber jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of ribbed cuff",
          },
        ],
      },
      {
        name: "Windbreaker",
        description: "Lightweight windbreaker with water-resistant fabric.",
        price: 59.99,
        category: "Outerwear",
        stock_quantity: 50,
        sizes: ["XS", "S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of windbreaker",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of windbreaker",
          },
        ],
      },
      {
        name: "Cardigan Sweater",
        description: "Cozy cardigan sweater with button-front closure.",
        price: 54.99,
        category: "Outerwear",
        stock_quantity: 55,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1614975059251-992f11792b9f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of cardigan sweater",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of button closure",
          },
          {
            url: "https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of cardigan sweater",
          },
        ],
      },
      {
        name: "Rain Jacket",
        description: "Waterproof rain jacket with hood and sealed seams.",
        price: 69.99,
        category: "Outerwear",
        stock_quantity: 45,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of rain jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of rain jacket",
          },
        ],
      },
      {
        name: "Fleece Jacket",
        description:
          "Soft fleece jacket with full-zip closure and cozy warmth.",
        price: 49.99,
        category: "Outerwear",
        stock_quantity: 60,
        sizes: ["XS", "S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of fleece jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of fleece jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of fleece texture",
          },
        ],
      },
      {
        name: "Blazer",
        description:
          "Classic blazer with a tailored fit and professional look.",
        price: 89.99,
        category: "Outerwear",
        stock_quantity: 40,
        sizes: ["XS", "S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of blazer",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of blazer",
          },
        ],
      },
      {
        name: "Parka",
        description: "Warm parka with fur-lined hood and multiple pockets.",
        price: 129.99,
        category: "Outerwear",
        stock_quantity: 30,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of parka",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of parka",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of fur-lined hood",
          },
        ],
      },
      {
        name: "Quilted Vest",
        description: "Insulated quilted vest for layering and core warmth.",
        price: 49.99,
        category: "Outerwear",
        stock_quantity: 50,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of quilted vest",
          },
          {
            url: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of quilted vest",
          },
        ],
      },
      {
        name: "Poncho",
        description: "Stylish poncho with a draped silhouette and cozy feel.",
        price: 44.99,
        category: "Outerwear",
        stock_quantity: 40,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of poncho",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of poncho",
          },
        ],
      },
      {
        name: "Shearling Coat",
        description:
          "Luxurious shearling coat with incredible warmth and style.",
        price: 249.99,
        category: "Outerwear",
        stock_quantity: 20,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of shearling coat",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of shearling texture",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of shearling coat",
          },
        ],
      },
      {
        name: "Utility Jacket",
        description:
          "Functional utility jacket with multiple pockets and durable fabric.",
        price: 74.99,
        category: "Outerwear",
        stock_quantity: 45,
        sizes: ["S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of utility jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of utility jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of utility jacket pockets",
          },
        ],
      },
      {
        name: "Cape Coat",
        description:
          "Elegant cape coat with a dramatic silhouette and sophisticated style.",
        price: 89.99,
        category: "Outerwear",
        stock_quantity: 35,
        sizes: ["S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of cape coat",
          },
          {
            url: "https://images.unsplash.com/photo-1604644401890-0bd678c83788?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view showing cape silhouette",
          },
        ],
      },
      {
        name: "Cropped Jacket",
        description: "Stylish cropped jacket with a modern silhouette.",
        price: 64.99,
        category: "Outerwear",
        stock_quantity: 45,
        sizes: ["XS", "S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of cropped jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of cropped jacket",
          },
        ],
      },
      {
        name: "Suede Jacket",
        description:
          "Luxurious suede jacket with a soft texture and timeless style.",
        price: 149.99,
        category: "Outerwear",
        stock_quantity: 25,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of suede jacket",
          },
          {
            url: "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of suede texture",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of suede jacket",
          },
        ],
      },
      {
        name: "Hoodie",
        description:
          "Comfortable hoodie with kangaroo pocket and drawstring hood.",
        price: 39.99,
        category: "Outerwear",
        stock_quantity: 75,
        sizes: ["XS", "S", "M", "L", "XL", "XXL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1614975059251-992f11792b9f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of hoodie",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of hood and drawstrings",
          },
          {
            url: "https://images.unsplash.com/photo-1608744882201-52a7f7f3dd60?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of hoodie",
          },
        ],
      },

      // ACCESSORIES CATEGORY - 20 products
      {
        name: "Beanie Hat",
        description: "Warm and stylish beanie hat for cold weather.",
        price: 24.99,
        category: "Accessories",
        stock_quantity: 150,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of beanie hat",
          },
          {
            url: "https://images.unsplash.com/photo-1511500118080-275313ec90a1?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of beanie hat",
          },
        ],
      },
      {
        name: "Leather Belt",
        description: "Classic leather belt with metal buckle.",
        price: 34.99,
        category: "Accessories",
        stock_quantity: 100,
        sizes: ["S", "M", "L", "XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Full view of leather belt",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of belt buckle",
          },
        ],
      },
      {
        name: "Silk Scarf",
        description: "Elegant silk scarf with vibrant pattern.",
        price: 39.99,
        category: "Accessories",
        stock_quantity: 80,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Full view of silk scarf",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of scarf pattern",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Scarf styled on model",
          },
        ],
      },
      {
        name: "Leather Gloves",
        description: "Premium leather gloves with soft lining for warmth.",
        price: 44.99,
        category: "Accessories",
        stock_quantity: 70,
        sizes: ["S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Pair of leather gloves",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of leather texture",
          },
        ],
      },
      {
        name: "Statement Necklace",
        description: "Bold statement necklace to elevate any outfit.",
        price: 49.99,
        category: "Accessories",
        stock_quantity: 60,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of statement necklace",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of necklace elements",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Necklace styled on model",
          },
        ],
      },
      {
        name: "Sunglasses",
        description: "Stylish sunglasses with UV protection.",
        price: 59.99,
        category: "Accessories",
        stock_quantity: 90,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of sunglasses",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of sunglasses",
          },
        ],
      },
      {
        name: "Leather Wallet",
        description:
          "Classic leather wallet with multiple card slots and bill compartment.",
        price: 39.99,
        category: "Accessories",
        stock_quantity: 100,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Closed leather wallet",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Open wallet showing compartments",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of leather texture",
          },
        ],
      },
      {
        name: "Tote Bag",
        description:
          "Spacious tote bag with durable handles and stylish design.",
        price: 42.99,
        category: "Accessories",
        stock_quantity: 85,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of tote bag",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Inside view of tote bag",
          },
        ],
      },
      {
        name: "Baseball Cap",
        description: "Classic baseball cap with adjustable strap.",
        price: 24.99,
        category: "Accessories",
        stock_quantity: 120,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of baseball cap",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of baseball cap",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view showing adjustable strap",
          },
        ],
      },
      {
        name: "Stud Earrings",
        description: "Elegant stud earrings with minimalist design.",
        price: 29.99,
        category: "Accessories",
        stock_quantity: 100,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Close-up of stud earrings",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Earrings on display",
          },
        ],
      },
      {
        name: "Knit Infinity Scarf",
        description: "Cozy knit infinity scarf for warmth and style.",
        price: 32.99,
        category: "Accessories",
        stock_quantity: 90,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Full view of infinity scarf",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of knit texture",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Scarf styled on model",
          },
        ],
      },
      {
        name: "Leather Crossbody Bag",
        description: "Compact leather crossbody bag with adjustable strap.",
        price: 59.99,
        category: "Accessories",
        stock_quantity: 70,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of crossbody bag",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Inside view of crossbody bag",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of strap adjustment",
          },
        ],
      },
      {
        name: "Woven Fedora Hat",
        description: "Stylish woven fedora hat for sun protection and fashion.",
        price: 36.99,
        category: "Accessories",
        stock_quantity: 80,
        sizes: ["S/M", "L/XL"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of fedora hat",
          },
          {
            url: "https://images.unsplash.com/photo-1511500118080-275313ec90a1?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of fedora hat",
          },
        ],
      },
      {
        name: "Leather Watch",
        description: "Classic leather watch with analog face.",
        price: 79.99,
        category: "Accessories",
        stock_quantity: 60,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of watch face",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of watch band",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Watch on wrist",
          },
        ],
      },
      {
        name: "Patterned Socks",
        description: "Fun patterned socks with colorful designs.",
        price: 12.99,
        category: "Accessories",
        stock_quantity: 150,
        sizes: ["S", "M", "L"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Pair of patterned socks",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of sock pattern",
          },
        ],
      },
      {
        name: "Leather Card Holder",
        description: "Slim leather card holder for essential cards.",
        price: 24.99,
        category: "Accessories",
        stock_quantity: 110,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1627123424574-724758594e93?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of card holder",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Open card holder with cards",
          },
        ],
      },
      {
        name: "Wool Beret",
        description: "Classic wool beret with timeless style.",
        price: 29.99,
        category: "Accessories",
        stock_quantity: 70,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Top view of beret",
          },
          {
            url: "https://images.unsplash.com/photo-1511500118080-275313ec90a1?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Side view of beret",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Beret styled on model",
          },
        ],
      },
      {
        name: "Hoop Earrings",
        description: "Classic hoop earrings in various sizes.",
        price: 27.99,
        category: "Accessories",
        stock_quantity: 90,
        sizes: ["Small", "Medium", "Large"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of hoop earrings",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Earrings on display",
          },
        ],
      },
      {
        name: "Leather Backpack",
        description: "Stylish leather backpack with multiple compartments.",
        price: 89.99,
        category: "Accessories",
        stock_quantity: 50,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1591561954557-26941169b49e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of leather backpack",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Inside view of backpack",
          },
          {
            url: "https://images.unsplash.com/photo-1525450824786-227cbef70703?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Back view of backpack",
          },
        ],
      },
      {
        name: "Bow Tie",
        description: "Classic bow tie for formal occasions.",
        price: 22.99,
        category: "Accessories",
        stock_quantity: 80,
        sizes: ["One Size"],
        images: [
          {
            url: "https://images.unsplash.com/photo-1584030373081-f37b7bb4fa8e?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Front view of bow tie",
          },
          {
            url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1200&h=1600&auto=format&fit=crop",
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            alt_text: "Detail of bow tie fabric",
          },
        ],
      },
      // FOOTWEAR CATEGORY - 20 products
{
  name: "Classic Sneakers",
  description: "Versatile sneakers with comfortable fit and timeless style.",
  price: 59.99,
  category: "Footwear",
  stock_quantity: 80,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "White classic sneakers on a table",
    },
    {
      url: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of classic white sneakers",
    }
  ],
},
{
  name: "Leather Loafers",
  description: "Elegant leather loafers with comfortable slip-on design.",
  price: 79.99,
  category: "Footwear",
  stock_quantity: 60,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1597045566677-8cf032ed6634?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Brown leather loafers on a wooden surface",
    },
    {
      url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Close-up of leather loafers",
    }
  ],
},
{
  name: "Running Shoes",
  description: "Performance running shoes with cushioned support and breathable design.",
  price: 89.99,
  category: "Footwear",
  stock_quantity: 70,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Modern running shoes on a track",
    },
    {
      url: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of performance running shoes",
    }
  ],
},
{
  name: "Ankle Boots",
  description: "Stylish ankle boots with comfortable heel and durable construction.",
  price: 94.99,
  category: "Footwear",
  stock_quantity: 55,
  sizes: ["6", "7", "8", "9", "10"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Black ankle boots on a white background",
    },
    {
      url: "https://images.unsplash.com/photo-1601921200556-53b1d5b0f0a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of stylish ankle boots",
    }
  ],
},
{
  name: "Sandals",
  description: "Comfortable sandals with adjustable straps for a perfect fit.",
  price: 49.99,
  category: "Footwear",
  stock_quantity: 75,
  sizes: ["6", "7", "8", "9", "10", "11"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Brown leather sandals on a wooden surface",
    },
    {
      url: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of comfortable sandals",
    }
  ],
},
{
  name: "Dress Shoes",
  description: "Elegant dress shoes with polished finish and comfortable insole.",
  price: 99.99,
  category: "Footwear",
  stock_quantity: 50,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Black leather dress shoes",
    },
    {
      url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Close-up of polished dress shoes",
    }
  ],
},
{
  name: "Slip-On Canvas Shoes",
  description: "Casual slip-on canvas shoes for everyday comfort.",
  price: 39.99,
  category: "Footwear",
  stock_quantity: 85,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Colorful slip-on canvas shoes",
    },
    {
      url: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of slip-on canvas shoes",
    }
  ],
},
{
  name: "Hiking Boots",
  description: "Durable hiking boots with waterproof construction and excellent traction.",
  price: 119.99,
  category: "Footwear",
  stock_quantity: 45,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1542272604-787c3835535d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Brown hiking boots on rocky terrain",
    },
    {
      url: "https://images.unsplash.com/photo-1600267175161-cfaa711b4a81?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Close-up of hiking boot tread",
    }
  ],
},
{
  name: "Ballet Flats",
  description: "Elegant ballet flats with cushioned insole and flexible design.",
  price: 44.99,
  category: "Footwear",
  stock_quantity: 70,
  sizes: ["6", "7", "8", "9", "10"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Black ballet flats on a white background",
    },
    {
      url: "https://images.unsplash.com/photo-1542816417-0983675a5c8f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of elegant ballet flats",
    }
  ],
},
{
  name: "High-Top Sneakers",
  description: "Stylish high-top sneakers with ankle support and comfortable fit.",
  price: 69.99,
  category: "Footwear",
  stock_quantity: 60,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "White high-top sneakers",
    },
    {
      url: "https://images.unsplash.com/photo-1600267175161-cfaa711b4a81?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of high-top sneakers",
    }
  ],
},
{
  name: "Espadrilles",
  description: "Casual espadrilles with jute sole and comfortable canvas upper.",
  price: 49.99,
  category: "Footwear",
  stock_quantity: 65,
  sizes: ["6", "7", "8", "9", "10", "11"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Striped espadrilles on a wooden surface",
    },
    {
      url: "https://images.unsplash.com/photo-1542816417-0983675a5c8f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of espadrilles showing jute sole",
    }
  ],
},
{
  name: "Leather Mules",
  description: "Stylish leather mules with open back and comfortable fit.",
  price: 64.99,
  category: "Footwear",
  stock_quantity: 55,
  sizes: ["6", "7", "8", "9", "10"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1597045566677-8cf032ed6634?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Black leather mules on a white background",
    },
    {
      url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of leather mules showing open back",
    }
  ],
},
{
  name: "Waterproof Rain Boots",
  description: "Practical rain boots with waterproof construction and non-slip sole.",
  price: 59.99,
  category: "Footwear",
  stock_quantity: 50,
  sizes: ["6", "7", "8", "9", "10", "11"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Yellow rain boots on a wet surface",
    },
    {
      url: "https://images.unsplash.com/photo-1601921200556-53b1d5b0f0a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view of waterproof rain boots",
    }
  ],
},
{
  name: "Suede Desert Boots",
  description: "Classic suede desert boots with crepe sole and timeless style.",
  price: 79.99,
  category: "Footwear",
  stock_quantity: 45,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1597045566677-8cf032ed6634?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Tan suede desert boots",
    },
    {
      url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Close-up of suede texture on desert boots",
    }
  ],
},
{
  name: "Platform Sandals",
  description: "Trendy platform sandals with comfortable footbed and adjustable straps.",
  price: 54.99,
  category: "Footwear",
  stock_quantity: 60,
  sizes: ["6", "7", "8", "9", "10"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Black platform sandals",
    },
    {
      url: "https://images.unsplash.com/photo-1542816417-0983675a5c8f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view showing platform height",
    }
  ],
},
{
  name: "Penny Loafers",
  description: "Classic penny loafers with premium leather and comfortable fit.",
  price: 84.99,
  category: "Footwear",
  stock_quantity: 50,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1597045566677-8cf032ed6634?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Brown penny loafers",
    },
    {
      url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Close-up of penny slot detail",
    }
  ],
},
{
  name: "Athletic Slides",
  description: "Comfortable athletic slides with contoured footbed and quick-dry design.",
  price: 34.99,
  category: "Footwear",
  stock_quantity: 80,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Black athletic slides",
    },
    {
      url: "https://images.unsplash.com/photo-1600267175161-cfaa711b4a81?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view showing contoured footbed",
    }
  ],
},
{
  name: "Chelsea Boots",
  description: "Classic Chelsea boots with elastic side panels and pull tab.",
  price: 89.99,
  category: "Footwear",
  stock_quantity: 55,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Black Chelsea boots",
    },
    {
      url: "https://images.unsplash.com/photo-1601921200556-53b1d5b0f0a3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Close-up of elastic side panels",
    }
  ],
},
{
  name: "Wedge Heels",
  description: "Comfortable wedge heels with stable platform and stylish design.",
  price: 69.99,
  category: "Footwear",
  stock_quantity: 50,
  sizes: ["6", "7", "8", "9", "10"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Beige wedge heels",
    },
    {
      url: "https://images.unsplash.com/photo-1542816417-0983675a5c8f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Side view showing wedge shape",
    }
  ],
},
{
  name: "Boat Shoes",
  description: "Classic boat shoes with non-marking sole and water-resistant leather.",
  price: 64.99,
  category: "Footwear",
  stock_quantity: 60,
  sizes: ["7", "8", "9", "10", "11", "12"],
  images: [
    {
      url: "https://images.unsplash.com/photo-1597045566677-8cf032ed6634?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Brown leather boat shoes",
    },
    {
      url: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&h=1600",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      alt_text: "Close-up of non-marking sole",
    }
  ],
},
    ];

    for (const product of products) {
      // Check if product already exists
      const existingProduct = await query(
        "SELECT * FROM products WHERE name = $1",
        [product.name]
      );

      if (existingProduct.rows.length === 0) {
        // Insert product
        const categoryId = categoryMap[product.category];

        const productResult = await query(
          "INSERT INTO products (name, description, price, category_id, stock_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING id",
          [
            product.name,
            product.description,
            product.price,
            categoryId,
            product.stock_quantity,
          ]
        );

        const productId = productResult.rows[0].id;

        // Insert product sizes
        for (const size of product.sizes) {
          const sizeStockQuantity = Math.floor(
            product.stock_quantity / product.sizes.length
          );
          await query(
            "INSERT INTO product_sizes (product_id, size, stock_quantity) VALUES ($1, $2, $3)",
            [productId, size, sizeStockQuantity]
          );
        }

        // Insert product images
        for (let i = 0; i < product.images.length; i++) {
          const image = product.images[i];
          await query(
            "INSERT INTO product_images (product_id, image_url, is_primary, width, height, alt_text) VALUES ($1, $2, $3, $4, $5, $6)",
            [
              productId,
              image.url,
              i === 0, // First image is primary
              image.width,
              image.height,
              image.alt_text,
            ]
          );
        }
      }
    }

    console.log("Products seeded successfully");
  } catch (error) {
    console.error("Error seeding products:", error);
  }
};

// Function to seed test users
const seedTestUsers = async () => {
  try {
    const testUsers = [
      {
        email: "user1@example.com",
        password: "password123",
        first_name: "John",
        last_name: "Doe",
      },
      {
        email: "user2@example.com",
        password: "password123",
        first_name: "Jane",
        last_name: "Smith",
      },
    ];

    for (const user of testUsers) {
      const existingUser = await query("SELECT * FROM users WHERE email = $1", [
        user.email,
      ]);

      if (existingUser.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(user.password, 10);

        await query(
          "INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4)",
          [user.email, hashedPassword, user.first_name, user.last_name]
        );

        // Create a cart for the user
        const userResult = await query(
          "SELECT id FROM users WHERE email = $1",
          [user.email]
        );
        const userId = userResult.rows[0].id;

        await query("INSERT INTO carts (user_id) VALUES ($1)", [userId]);
      }
    }

    console.log("Test users seeded successfully");
  } catch (error) {
    console.error("Error seeding test users:", error);
  }
};

// Function to seed test orders
const seedTestOrders = async () => {
  try {
    // Get a test user
    const userResult = await query("SELECT id FROM users WHERE email = $1", [
      "user1@example.com",
    ]);

    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;

      // Get some products
      const productsResult = await query(
        "SELECT id, name, price FROM products LIMIT 3"
      );
      const products = productsResult.rows;

      if (products.length > 0) {
        // Create an order
        const orderNumber = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`;
        const totalAmount = products.reduce(
          (sum, product) => sum + Number.parseFloat(product.price),
          0
        );

        const orderResult = await query(
          "INSERT INTO orders (order_number, user_id, status, total_amount, shipping_address, shipping_method, payment_method) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
          [
            orderNumber,
            userId,
            "completed",
            totalAmount,
            "123 Main St, Anytown, USA",
            "Standard Shipping",
            "Credit Card",
          ]
        );

        const orderId = orderResult.rows[0].id;

        // Add order items
        for (const product of products) {
          await query(
            "INSERT INTO order_items (order_id, product_id, product_name, size, quantity, price) VALUES ($1, $2, $3, $4, $5, $6)",
            [orderId, product.id, product.name, "M", 1, product.price]
          );
        }

        console.log("Test orders seeded successfully");
      }
    }
  } catch (error) {
    console.error("Error seeding test orders:", error);
  }
};

// Main seed function
const seedDatabase = async () => {
  try {
    await initializeSchema();
    
    console.log("Database is initialized and ready");
    
    // Now proceed with seeding data
    await seedAdminUser();
    await seedCategories();
    await seedProducts();
    await seedTestUsers();
    await seedTestOrders();

    console.log("Database seeding completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();