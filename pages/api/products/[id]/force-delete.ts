import type { NextApiRequest, NextApiResponse } from "next"
import { forceDeleteExistingProduct } from "../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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