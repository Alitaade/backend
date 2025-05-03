import type { NextApiRequest, NextApiResponse } from "next"
import { getProduct, updateExistingProduct, deleteExistingProduct } from "../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      // Public endpoint - get a product by ID
      return getProduct(req, res)

    case "PUT":
      // Admin only - update a product
      return new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, () => {
            updateExistingProduct(req, res).finally(() => resolve())
          })
        })
      })

    case "DELETE":
      // Admin only - delete a product
      return new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, () => {
            deleteExistingProduct(req, res).finally(() => resolve())
          })
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}