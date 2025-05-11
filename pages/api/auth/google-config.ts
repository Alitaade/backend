// pages/api/auth/google-config.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { allowedOrigins } from "../../../middleware/origins";

// Helper function to handle CORS
const setCorsHeaders = (res: NextApiResponse, req: NextApiRequest) => {
  const origin = req.headers.origin;
  
  // Since you mentioned "Allow anything", we'll set a permissive CORS policy
  // But we'll still use the allowedOrigins for special treatment (credentials)
  if (origin && allowedOrigins.includes(origin)) {
    // For trusted origins, allow credentials
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    // For all other origins, allow without credentials
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Note: We don't set Allow-Credentials for wildcard origins as it's not allowed
  }
  
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers for all requests
  setCorsHeaders(res, req);

  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Return the Google Client ID
  return res.status(200).json({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
  });
}