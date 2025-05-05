import type { NextApiRequest, NextApiResponse } from "next"
import { deleteImage } from "@/controllers/product-controller"
import { requireAdmin, enableCors } from "@/middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  enableCors(req, res, async () => {
    switch (req.method) {
      case "DELETE":
        // Admin only - delete an image
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, () => {
            deleteImage(req, res).finally(() => resolve())
          })
        })

      default:
        return res.status(405).json({ error: "Method not allowed" })
    }
  })
}
