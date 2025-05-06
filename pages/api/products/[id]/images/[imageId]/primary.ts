// Let's create an endpoint for setting an image as primary

import type { NextApiRequest, NextApiResponse } from "next"
import { setPrimaryImage } from "@/controllers/product-controller"
import { requireAdmin, enableCors } from "@/middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "PATCH, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  switch (req.method) {
    case "PATCH":
      // Admin only - set an image as primary
      return new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, () => {
            setPrimaryImage(req, res).finally(() => resolve())
          })
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}
