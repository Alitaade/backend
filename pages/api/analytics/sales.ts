import type { NextApiRequest, NextApiResponse } from "next"
import { getSalesReport } from "@/controllers/admin-controller"
import { requireAdmin } from "../../../middleware/auth-middleware"
import { applyMiddleware } from "../../../middleware/api-security"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Pass control to the controller
  return getSalesReport(req, res)
}

// Apply admin authentication and CORS middleware
export default applyMiddleware(requireAdmin(handler as any))