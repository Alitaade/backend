// pages/api/products/[id]/images/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { addMultipleImages } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"

// Update the config to properly handle multipart/form-data
export const config = {
  api: {
    bodyParser: false, // Important: Disable the built-in body parser for multipart/form-data
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  enableCors(req, res, async () => {
    switch (req.method) {
      case "POST":
        // Admin only - add multiple images to a product
        return new Promise((resolve) => {
          requireAdmin(req, res, () => {
            addMultipleImages(req, res).finally(() => resolve())
          })
        })
      default:
        return res.status(405).json({ error: "Method not allowed" })
    }
  })
}
