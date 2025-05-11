import type { NextApiRequest, NextApiResponse } from "next"
import { googleAuth } from "../../../controllers/auth-controller"
import { allowedOrigins } from "../../../middleware/origins"

// Helper function to handle CORS
const setCorsHeaders = (res: NextApiResponse, req: NextApiRequest) => {
  const origin = req.headers.origin;
  
  // Check if the origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.setHeader("Access-Control-Allow-Credentials", "true")
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  setCorsHeaders(res, req)
  
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // Only allow POST method for Google authentication
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Call the googleAuth controller
  try {
    await googleAuth(req, res)
  } catch (error) {
    console.error("Unhandled error in Google auth handler:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}