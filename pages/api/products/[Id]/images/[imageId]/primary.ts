import type { NextApiRequest, NextApiResponse } from "next"
import { setPrimaryImage } from "../../../../../../controllers/product-controller"
import { requireAdmin } from "../../../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "PATCH":
      // Admin only - set an image as primary
      return new Promise<void>((resolve) => {
        requireAdmin(req, res, () => {
          setPrimaryImage(req, res).finally(() => resolve())
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}