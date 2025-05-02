import type { NextApiRequest, NextApiResponse } from "next"
import {
  getCategory,
  updateExistingCategory,
  deleteExistingCategory,
} from "../../../controllers/category-controller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    switch (req.method) {
      case "GET":
        // Public endpoint - get a category by ID
        return getCategory(req, res)

      case "PUT":
        // Admin only - update a category
        return new Promise<void>((resolve) => {
          enableCors(req, res, () => {
            requireAdmin(req, res, () => {
              updateExistingCategory(req, res).finally(() => resolve())
            })
          })
        })

      case "DELETE":
        // Admin only - delete a category
        return new Promise<void>((resolve) => {
          enableCors(req, res, () => {
            requireAdmin(req, res, () => {
              deleteExistingCategory(req, res).finally(() => resolve())
            })
          })
        })

      default:
        res.setHeader("Allow", ["GET", "PUT", "DELETE", "OPTIONS"])
        return res.status(405).json({ error: "Method not allowed" })
    }
  } catch (error) {
    console.error("Unhandled error in category handler:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
