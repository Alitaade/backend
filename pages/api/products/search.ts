import type { NextApiRequest, NextApiResponse } from "next"
import { searchProducts } from "../../../controllers/product-controller"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      // Public endpoint - search products
      return searchProducts(req, res)

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}