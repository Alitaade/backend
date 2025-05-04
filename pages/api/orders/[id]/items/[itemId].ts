// pages/api/orders/[id]/items/[itemId].ts
import type { NextApiRequest, NextApiResponse } from "next"
import { enableCors, requireAdmin } from "../../../../../middleware/auth-middleware"
import { deleteOrderItemHandler } from "../../../../../controllers/order-controller"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  const { id, itemId } = req.query
  if (!id || Array.isArray(id) || !itemId || Array.isArray(itemId)) {
    return res.status(400).json({ error: "Invalid order or item ID" })
  }

  try {
    switch (req.method) {
      case "DELETE":
        return new Promise<void>((resolve, reject) => {
          enableCors(req, res, async () => {
          requireAdmin(req, res, async () => {
            try {
              await deleteOrderItemHandler(req, res, id, itemId)
              resolve()
            } catch (error) {
              console.error("Error in deleteOrderItem:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order item deletion" })
              }
              reject(error)
            }
          })
        })
        })

      default:
        res.setHeader("Allow", ["DELETE", "OPTIONS"])
        return res.status(405).json({ error: "Method not allowed" })
    }
  } catch (error) {
    console.error("Unhandled error in order item API handler:", error)
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" })
    }
  }
}
