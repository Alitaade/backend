import type { NextApiRequest, NextApiResponse } from "next"
import { validateImageUrls } from "../../../controllers/upload-controller"
import { requireAdmin } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "POST":
      // Admin only - validate image URLs
      return new Promise<void>((resolve) => {
        requireAdmin(req, res, () => {
          validateImageUrls(req, res).finally(() => resolve())
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}

