import { query, executeTransaction } from "./connection";

// Function to create all necessary tables
export const createTables = async () => {
  try {
    // Use a transaction to ensure all tables are created or none
    return await executeTransaction(async (client) => {
      // Create users table with new fields
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255),
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          phone VARCHAR(20),
          whatsapp VARCHAR(20),
          gender VARCHAR(20),
          address TEXT,
          is_admin BOOLEAN DEFAULT FALSE,
          google_id VARCHAR(255) UNIQUE,
          profile_complete BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create product categories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create products table
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          stock_quantity INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create product images table with s3_key column included
      await client.query(`
        CREATE TABLE IF NOT EXISTS product_images (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          is_primary BOOLEAN DEFAULT FALSE,
          width INTEGER,
          height INTEGER,
          alt_text TEXT,
          s3_key VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index on s3_key for product_images
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_product_images_s3_key ON product_images(s3_key)
      `);

      // Create product sizes table
      await client.query(`
        CREATE TABLE IF NOT EXISTS product_sizes (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          size VARCHAR(20) NOT NULL,
          stock_quantity INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create carts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS carts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create cart items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id SERIAL PRIMARY KEY,
          cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
          size VARCHAR(20),
          quantity INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create transactions table (unified syntax)
      await client.query(`
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          reference VARCHAR(255) NOT NULL,
          amount DECIMAL(10, 2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          metadata TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create orders table (unified structure and syntax with currency fields)
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id),
          total_amount DECIMAL(10, 2) NOT NULL,
          currency_code VARCHAR(10) DEFAULT 'USD',
          currency_rate DECIMAL(10, 6) DEFAULT 1,
          status VARCHAR(50) DEFAULT 'processing',
          shipping_address TEXT NOT NULL,
          shipping_method VARCHAR(100),
          payment_method VARCHAR(100),
          payment_reference VARCHAR(255),
          payment_status VARCHAR(50),
          payment_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create order items table (unified syntax with product_name column added)
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER REFERENCES products(id),
          product_name VARCHAR(255) NOT NULL,
          quantity INTEGER NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          size VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create payment verification tokens table
      await client.query(`
        CREATE TABLE IF NOT EXISTS payment_verification_tokens (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          order_number VARCHAR(50) NOT NULL REFERENCES orders(order_number) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          used BOOLEAN DEFAULT FALSE,
          usage_count INTEGER DEFAULT 0
        )
      `);

      // Add indexes for faster lookups on payment verification tokens
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_payment_verification_tokens_order_number ON payment_verification_tokens(order_number);
        CREATE INDEX IF NOT EXISTS idx_payment_verification_tokens_token ON payment_verification_tokens(token);
      `);

      // Create verification_codes table
      await client.query(`
        CREATE TABLE IF NOT EXISTS verification_codes (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          code VARCHAR(10) NOT NULL,
          type VARCHAR(20) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          attempts INTEGER DEFAULT 0,
          verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT valid_type CHECK (type IN ('password_reset', 'email_verification', 'phone_verification'))
        )
      `);

      // Create indexes for faster lookups on verification codes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
        CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
        CREATE INDEX IF NOT EXISTS idx_verification_codes_type ON verification_codes(type);
      `);

      // Create password_reset_tokens table for link-based resets
      await client.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(64) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for faster lookups on password reset tokens
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
      `);
      console.log("All tables created successfully");
      return true;
    });
  } catch (error) {
    console.error("Error creating tables:", error);
    return false;
  }
};

// Function to drop all tables (useful for development)
export const dropTables = async () => {
  try {
    // Use a transaction to ensure all tables are dropped or none
    return await executeTransaction(async (client) => {
      await client.query("DROP TABLE IF EXISTS password_reset_tokens CASCADE");
      await client.query("DROP TABLE IF EXISTS verification_codes CASCADE");
      await client.query("DROP TABLE IF EXISTS payment_verification_tokens CASCADE");
      await client.query("DROP TABLE IF EXISTS order_items CASCADE");
      await client.query("DROP TABLE IF EXISTS orders CASCADE");
      await client.query("DROP TABLE IF EXISTS transactions CASCADE");
      await client.query("DROP TABLE IF EXISTS cart_items CASCADE");
      await client.query("DROP TABLE IF EXISTS carts CASCADE");
      await client.query("DROP TABLE IF EXISTS product_sizes CASCADE");
      await client.query("DROP TABLE IF EXISTS product_images CASCADE");
      await client.query("DROP TABLE IF EXISTS products CASCADE");
      await client.query("DROP TABLE IF EXISTS categories CASCADE");
      await client.query("DROP TABLE IF EXISTS users CASCADE");

      console.log("All tables dropped successfully");
      return true;
    });
  } catch (error) {
    console.error("Error dropping tables:", error);
    return false;
  }
};

// Initialize database schema, but with proper sequence and verification
export const initializeSchema = async () => {
  try {
    // Drop the tables first
    await dropTables();
    
    // Create the tables
    await createTables();
    
    // Verify that the tables were created
    await verifyTables();
    
    return true;
  } catch (error) {
    console.error("Error initializing schema:", error);
    return false;
  }
};

// Function to verify that tables were created properly
export const verifyTables = async () => {
  const tableNames = [
    "users",
    "categories",
    "products",
    "product_images",
    "product_sizes",
    "carts",
    "cart_items",
    "transactions",
    "orders",
    "order_items",
    "payment_verification_tokens",
    "verification_codes",
    "password_reset_tokens"
  ];
  
  try {
    for (const tableName of tableNames) {
      const res = await query(
        `SELECT EXISTS (
           SELECT FROM information_schema.tables 
           WHERE table_schema = 'public'
           AND table_name = $1
         )`,
        [tableName]
      );
      
      const exists = res.rows[0].exists;
      if (!exists) {
        console.error(`Table ${tableName} does not exist after schema initialization`);
        return false;
      }
    }
    
    console.log("All tables verified successfully");
    return true;
  } catch (error) {
    console.error("Error verifying tables:", error);
    return false;
  }
};

/**
 * Migration to add s3_key column to product_images table (for existing databases)
 * Note: This is only needed for updating existing databases, as new databases
 * will already have this column from the createTables function
 */
export async function addS3KeyToProductImages() {
  try {
    console.log("Starting migration: Add s3_key to product_images table");
    
    // Check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'product_images' AND column_name = 's3_key'
    `;
    
    const columnCheck = await query(checkColumnQuery);
    
    if (columnCheck.rows.length > 0) {
      console.log("Column s3_key already exists in product_images table");
      return;
    }
    
    // Add the s3_key column
    await query(`
      ALTER TABLE product_images 
      ADD COLUMN s3_key VARCHAR(255)
    `);
    
    console.log("Successfully added s3_key column to product_images table");
    
    // Create an index on s3_key for faster lookups
    await query(`
      CREATE INDEX idx_product_images_s3_key ON product_images(s3_key)
    `);
    
    console.log("Successfully created index on s3_key column");
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error in migration:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addS3KeyToProductImages()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}