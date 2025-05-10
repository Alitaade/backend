import type { NextApiRequest, NextApiResponse } from "next"
import { forceDeleteExistingProduct } from "../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
      // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "PUT, DELETE, GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }
  enableCors(req, res, async () => {
    if (req.method !== "DELETE") {
      return res.status(405).json({ error: "Method not allowed" })
    }
    
    return new Promise((resolve) => {
      requireAdmin(req, res, () => {
        forceDeleteExistingProduct(req, res).finally(() => resolve())
      })
    })
  })
}