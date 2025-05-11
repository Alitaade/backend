// File: pages/api/index.js with CORS headers
import type { NextApiRequest, NextApiResponse } from "next";
import { checkConnection } from "../../database/connection";
import {allowedOrigins} from "../../middleware/origins";
// Configure CORS middleware
const enableCors = (req: NextApiRequest, res: NextApiResponse, callback: () => void) => {

  const origin = req.headers.origin;
  
  // Check if the origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    // Set CORS headers for allowed origins
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // For requests without origin (like from Postman) or non-allowed origins
    // You could either deny the request or allow it without CORS headers
    // Here we allow it without specific origin
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Common CORS headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader(
    'Access-Control-Allow-Headers', 
    'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization, X-CSRF-Token, X-API-Key'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Call the actual handler
  return callback();
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return enableCors(req, res, async () => {
    try {
      // Check database connection
      const isConnected = await checkConnection();

      return res.status(200).json({
        status: "success",
        message: "API is running",
        database: isConnected ? "connected" : "disconnected",
        version: "1.0.0",
      });
    } catch (error) {
      console.error("API health check error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });
}