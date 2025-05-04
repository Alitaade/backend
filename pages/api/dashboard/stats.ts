import type { NextApiRequest, NextApiResponse } from "next"
import { enableCors, requireAdmin } from "../../../middleware/auth-middleware"
import { getDashboardStats } from "../../../controllers/dashboard-controller"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*") // In production, use specific origins
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  // Handle OPTIONS request properly
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET", "OPTIONS"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Admin only endpoint
  return new Promise<void>((resolve, reject) => {
    enableCors(req, res, async () => {
    requireAdmin(req, res, async () => {
      try {
        await getDashboardStats(req, res)
        resolve()
      } catch (error) {
        console.error("Error in getDashboardStats:", error)
        if (!res.writableEnded) {
          res.status(500).json({ error: "Server error processing dashboard stats request" })
        }
        reject(error)
      }
    })
  })
  })
}
