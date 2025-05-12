/**
 * List of allowed origins for CORS
 * Includes both frontend and backend URLs
 */
export const allowedOrigins: string[] = [
  // Frontend URL (required)
  process.env.FRONTEND_URL || "https://www.pro-project-gilt.vercel.app",
  
  // Backend URL (required)
  process.env.ADMIN_ORIGIN || "https://www.admin-frontends.vercel.app",

  process.env.BACKEND_URL || "https://www.onlu.vercel.app",
];

// Add localhost for development
if (process.env.NODE_ENV === "development") {
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://localhost:3001");
}

export default allowedOrigins;