// pages/api/products/[id]/images/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { addMultipleImages } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"

// Set a longer timeout for this specific route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // Increase size limit for image uploads
    },
    responseLimit: false, // No response size limit
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
