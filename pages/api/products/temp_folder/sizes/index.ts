import type { NextApiRequest, NextApiResponse } from "next"
import { addSize } from "../../../../../controllers/product-controller"
import { requireAdmin } from "../../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "POST":
      // Admin only - add a size to a product
      return new Promise<void>((resolve) => {
        requireAdmin(req, res, () => {
          addSize(req, res).finally(() => resolve())
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}