import type { NextApiRequest, NextApiResponse } from "next"
import { exportData } from "../../../../controllers/admin-controller"
import { requireAdmin } from "../../../../middleware/auth-middleware"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Apply admin authentication middleware
  requireAdmin(req as any, res, () => {
    exportData(req, res)
  })
}
