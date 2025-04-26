import type { NextApiRequest, NextApiResponse } from "next"
import { toggleUserAdminStatus } from "@/controllers/admin-contoller"
import { requireAdmin } from "../../../../middleware/auth-middleware"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow PATCH requests
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Apply admin authentication middleware
  requireAdmin(req as any, res, () => {
    toggleUserAdminStatus(req, res)
  })
}
