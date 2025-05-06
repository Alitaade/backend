import { Pool, PoolClient } from "pg";

// Create a pool instance with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : false,
  max: 90, // Reduced from 50 to avoid connection overload
  idleTimeoutMillis: 30000, // Reduced to 30 seconds
  connectionTimeoutMillis: 90000, // 5 seconds connection timeout
  // statement_timeout removed from here - will be set at session level
});

// Add event listeners for connection issues
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Function to safely execute SQL queries with prepared statements
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  let client: PoolClient | null = null;
  
  try {
    // Get client from pool instead of using pool.query directly
    client = await pool.connect();
    
    // Set statement timeout at the session level
    await client.query('SET statement_timeout = 10000');
    
    // Use parameterized queries to prevent SQL injection
    const res = await client.query(text, params);
    
    const duration = Date.now() - start;
    
    // Only log minimal information in production
    if (process.env.NODE_ENV !== "production") {
      console.log("Executed query", { 
        text: text.substring(0, 80) + (text.length > 80 ? '...' : ''),
        duration, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error) {
    // Don't expose query text in production logs
    if (process.env.NODE_ENV === "production") {
      console.error("Error executing query", { error });
    } else {
      console.error("Error executing query", { 
        text: text.substring(0, 80) + (text.length > 80 ? '...' : ''), 
        error 
      });
    }
    throw error;
  } finally {
    // Always release the client back to the pool
    if (client) client.release();
  }
};

// Function to check database connection
export const checkConnection = async () => {
  try {
    const res = await query("SELECT NOW()");
    console.log("Database connection successful:", res.rows[0]);
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
};

// Add a shutdown handler to close pool gracefully
process.on('SIGTERM', () => {
  console.log('Closing database pool connections');
  pool.end();
});

export default pool;