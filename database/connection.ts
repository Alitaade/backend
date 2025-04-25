import { Pool } from "pg";

// Create a pool instance to manage database connections
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : false,
  max: 50,
  idleTimeoutMillis: 90000, // 90 seconds idle timeout
});

// Function to execute SQL queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Error executing query", { text, error });
    throw error;
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

export default pool;
