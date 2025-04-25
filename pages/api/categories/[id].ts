import type { NextApiRequest, NextApiResponse } from "next"
import { getCategory, updateExistingCategory, deleteExistingCategory } from "../../../controllers/category-controller"
import { requireAdmin } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      // Public endpoint - get a category by ID
      return getCategory(req, res)

    case "PUT":
      // Admin only - update a category
      return new Promise<void>((resolve) => {
        requireAdmin(req, res, () => {
          updateExistingCategory(req, res).finally(() => resolve())
        })
      })

    case "DELETE":
      // Admin only - delete a category
      return new Promise<void>((resolve) => {
        requireAdmin(req, res, () => {
          deleteExistingCategory(req, res).finally(() => resolve())
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}

