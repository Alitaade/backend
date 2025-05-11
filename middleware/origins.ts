
/**
 * List of allowed origins for CORS
 */
export const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ADMIN_BACKEND
  ];
  
  // Add localhost for development
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push("http://localhost:3000");
    allowedOrigins.push("http://localhost:3001");
  }
  
  export default allowedOrigins;