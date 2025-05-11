import type { NextApiRequest, NextApiResponse } from "next"
import { checkIdentifier } from "../../../controllers/identifier-controller"
import { allowedOrigins } from "../../../middleware/origins"

// Helper function to handle CORS
const setCorsHeaders = (res: NextApiResponse, req: NextApiRequest) => {
  const origin = req.headers.origin;
  
  // Check if the origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  setCorsHeaders(res, req)

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  return checkIdentifier(req, res)
}
