/**
 * List of allowed origins for CORS
 * Includes both frontend and backend URLs
 */
export const allowedOrigins: string[] = [
  // Frontend URL (required)
  process.env.FRONTEND_URL || "",
  
  // Backend URL (required)
  process.env.ADMIN_ORIGIN || "",

  process.env.BACKEND_URL || "",
];

// Add localhost for development
if (process.env.NODE_ENV === "development") {
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://localhost:3001");
}

export default allowedOrigins;