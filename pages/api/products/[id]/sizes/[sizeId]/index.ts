import type { NextApiRequest, NextApiResponse } from "next"
import { updateSize, deleteSize } from "../../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "PUT, DELETE, GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  enableCors(req, res, async () => {
    switch (req.method) {
      case "PUT":
        // Admin only - update a product size
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, () => {
            updateSize(req, res).finally(() => resolve())
          })
        })

      case "DELETE":
        // Admin only - delete a product size
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, () => {
            deleteSize(req, res).finally(() => resolve())
          })
        })

      default:
        return res.status(405).json({ error: "Method not allowed" })
    }
  })
}
