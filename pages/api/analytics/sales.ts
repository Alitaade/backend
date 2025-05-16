import type { NextApiRequest, NextApiResponse } from "next"
import { getSalesReport } from "@/controllers/admin-contoller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise<void>((resolve) => {
    // Apply middleware chain
    enableCors(req, res, () => {
      requireAdmin(req, res, async () => {
        try {
          // Only allow GET requests
          if (req.method !== "GET") {
            res.status(405).json({ error: "Method not allowed" })
            return resolve()
          }

          // Pass control to the controller
          await getSalesReport(req, res)
          resolve()
        } catch (error) {
          console.error("Error fetching sales report:", error)
          res.status(500).json({ error: "Failed to fetch sales report" })
          resolve()
        }
      })
    })
  })
}