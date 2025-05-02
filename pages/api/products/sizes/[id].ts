import type { NextApiRequest, NextApiResponse } from "next"
import { deleteSize } from "../../../../controllers/product-controller"
import { enableCors, requireAdmin } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  enableCors(req, res, async () => {
  switch (req.method) {
    case "DELETE":
      // Admin only - delete a product size
      return new Promise<void>((resolve) => {
        requireAdmin(req, res, () => {
          deleteSize(req, res).finally(() => resolve())
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
});
}

