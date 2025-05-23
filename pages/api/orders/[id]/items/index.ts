// pages/api/orders/[id]/items/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { authenticateUser } from "../../../../../middleware/auth-middleware"
import { getOrderItems } from "@/controllers/order-controller"
import type { AuthenticatedRequest } from "@/types"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  const { id } = req.query
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid order ID" })
  }

  try {
    switch (req.method) {
      case "GET":
        return new Promise<void>((resolve, reject) => {
          authenticateUser(req as unknown as AuthenticatedRequest, res, async () => {
            try {
              await getOrderItems(req, res, id)
              resolve()
            } catch (error) {
              console.error("Error in getOrderItems:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order items request" })
              }
              reject(error)
            }
          })
        })

      default:
        res.setHeader("Allow", ["GET", "OPTIONS"])
        return res.status(405).json({ error: "Method not allowed" })
    }
  } catch (error) {
    console.error("Unhandled error in order items API handler:", error)
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" })
    }
  }
}
