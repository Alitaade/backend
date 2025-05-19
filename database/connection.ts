import { Pool, PoolClient } from "pg";

// Create a pool instance with optimized settings
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : false,
  max: 20, // Reduced from 200 to a more reasonable value
  idleTimeoutMillis: 30000, // 30 seconds idle timeout
  connectionTimeoutMillis: 5000, // 5 seconds connection timeout
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
    await client.query('SET statement_timeout = 100000');
    
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

// Function to execute a transaction
export const executeTransaction = async (callback: (client: PoolClient) => Promise<any>) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction error:', error);
    throw error;
  } finally {
    client.release();
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