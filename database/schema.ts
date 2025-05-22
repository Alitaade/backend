import { query } from "./connection";


// Function to create all necessary tables
export const createTables = async () => {
  try {
    // Create users table with new fields
    await query(`
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
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create products table
    await query(`
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
    await query(`
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_product_images_s3_key ON product_images(s3_key)
    `);

    // Create product sizes table
    await query(`
      CREATE TABLE IF NOT EXISTS product_sizes (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        size VARCHAR(20) NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create carts table with NULL option for guest carts
    await query(`
      CREATE TABLE IF NOT EXISTS carts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create cart items table
    await query(`
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

    // Create transactions table
    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL NULL,
        reference VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table (unified structure and syntax with currency fields)
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL NULL,
        session_id VARCHAR(255),
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_order_identification CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
      )
    `);

    // Create order items table (unified syntax with product_name column added)
    await query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        size VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payment verification tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS payment_verification_tokens (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        order_number VARCHAR(50) NOT NULL REFERENCES orders(order_number) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used BOOLEAN DEFAULT FALSE
      )
    `);
   
    // Add indexes for faster lookups on payment verification tokens
    await query(`
      CREATE INDEX IF NOT EXISTS idx_payment_verification_tokens_order_number ON payment_verification_tokens(order_number);
      CREATE INDEX IF NOT EXISTS idx_payment_verification_tokens_token ON payment_verification_tokens(token);
    `);
        // Add usage_count column to payment_verification_tokens table if it doesn't exist
        await query(`
          ALTER TABLE payment_verification_tokens ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
        `);

    // Create verification_codes table
    await query(`
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
      CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
      CREATE INDEX IF NOT EXISTS idx_verification_codes_type ON verification_codes(type);
    `);

    // Create password_reset_tokens table for link-based resets
    await query(`
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
    await query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    `);

    console.log("All tables created successfully");
    return true;
  } catch (error) {
    console.error("Error creating tables:", error);
    return false;
  }
};

// Function to drop all tables (useful for development)
export const dropTables = async () => {
  try {
    await query("DROP TABLE IF EXISTS password_reset_tokens CASCADE");
    await query("DROP TABLE IF EXISTS verification_codes CASCADE"); 
    await query("DROP TABLE IF EXISTS payment_verification_tokens CASCADE");
    await query("DROP TABLE IF EXISTS order_items CASCADE");
    await query("DROP TABLE IF EXISTS orders CASCADE");
    await query("DROP TABLE IF EXISTS transactions CASCADE");
    await query("DROP TABLE IF EXISTS cart_items CASCADE");
    await query("DROP TABLE IF EXISTS carts CASCADE");
    await query("DROP TABLE IF EXISTS product_sizes CASCADE");
    await query("DROP TABLE IF EXISTS product_images CASCADE");
    await query("DROP TABLE IF EXISTS products CASCADE");
    await query("DROP TABLE IF EXISTS categories CASCADE");
    await query("DROP TABLE IF EXISTS users CASCADE");

    console.log("All tables dropped successfully");
    return true;
  } catch (error) {
    console.error("Error dropping tables:", error);
    return false;
  }
};

// Improved initialize schema function that doesn't drop tables in production
export const initializeSchema = async (forceReset = true) => {
  try {
    console.log("Force resetting database schema...");
    await dropTables();
    
    // Create the tables
    const created = await createTables();
    
    if (!created) {
      console.error("Failed to create tables");
      return false;
    }
    
    console.log("Database schema initialized successfully");
    return true;
    
    console.log("Database tables already exist, skipping initialization");
    return true;
  } catch (error) {
    console.error("Error initializing schema:", error);
    return false;
  }
};