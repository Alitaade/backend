import type { NextApiRequest, NextApiResponse } from "next"
import { exportData } from "@/controllers/admin-contoller"
import { requireAdmin, enableCors } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Admin only - process upload
  return new Promise<void>((resolve) => {
    enableCors(req, res, () => {
      requireAdmin(req, res, async () => {
        try {
          // Only allow GET requests
          if (req.method !== "GET") {
            res.status(405).json({ error: "Method not allowed" })
            return resolve()
          }

          await exportData(req, res)
          resolve()
        } catch (error) {
          console.error(`Error exporting ${req.query.dataType} data:`, error)
          res.status(500).json({ error: `Failed to export ${req.query.dataType} data` })
          resolve()
        }
      })
    })
  })
}