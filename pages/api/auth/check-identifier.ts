import type { NextApiRequest, NextApiResponse } from "next"
import { checkIdentifier } from "../../../controllers/identifier-controller"

// Helper function to handle CORS
const setCorsHeaders = (res: NextApiResponse) => {
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Origin", "https://pro-project-gilt.vercel.app")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  setCorsHeaders(res)

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
