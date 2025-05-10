import type { NextApiRequest, NextApiResponse } from "next"
import { getProduct, updateExistingProduct, deleteExistingProduct } from "../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"

// Increase the bodyParser limit for this specific API route
export const config = {
  api: {
    responseLimit: "10mb",
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "PUT, DELETE, GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

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