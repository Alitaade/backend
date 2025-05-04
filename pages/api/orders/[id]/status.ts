// pages/api/orders/[id]/status.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { requireAdmin } from "../../../../middleware/auth-middleware"
import { updateOrderStatusHandler } from "../../../../controllers/order-status-controller"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
      case "PUT":
        return new Promise<void>((resolve, reject) => {
          requireAdmin(req, res, async () => {
            try {
              await updateOrderStatusHandler(req, res, id)
              resolve()
            } catch (error) {
              console.error("Error in updateOrderStatus:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing status update" })
              }
              reject(error)
            }
          })
        })

      default:
        res.setHeader("Allow", ["PUT", "OPTIONS"])
        return res.status(405).json({ error: "Method not allowed" })
    }
  } catch (error) {
    console.error("Unhandled error in order status API handler:", error)
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" })
    }
  }
}
