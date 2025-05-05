// Let's create an endpoint for adding images by URL

import type { NextApiRequest, NextApiResponse } from "next"
import { addImageByUrl } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  switch (req.method) {
    case "POST":
      // Admin only - add an image by URL
      return new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, () => {
            addImageByUrl(req, res).finally(() => resolve())
          })
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}
