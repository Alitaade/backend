import type { NextApiRequest, NextApiResponse } from "next"
import { exportData } from "@/controllers/admin-contoller"
import { requireAdmin } from "../../../../middleware/auth-middleware"
import { applyMiddleware } from "../../../../middleware/api-security"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    await exportData(req, res)
  } catch (error) {
    console.error(`Error exporting ${req.query.dataType} data:`, error)
    res.status(500).json({ error: `Failed to export ${req.query.dataType} data` })
  }
}

// Apply admin authentication and CORS middleware
export default applyMiddleware(requireAdmin(handler as any))
