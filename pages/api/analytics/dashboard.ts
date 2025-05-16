import type { NextApiRequest, NextApiResponse } from "next"
import { getDashboardStats } from "@/controllers/admin-contoller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Apply admin authentication middleware
  enableCors(req, res, () => {
  requireAdmin(req as any, res, () => {
    getDashboardStats(req, res)
  })
})
}
