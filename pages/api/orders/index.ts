import type { NextApiRequest, NextApiResponse } from "next"
import { createOrder } from "../../../controllers/order-controller"
import { getOrdersHandler } from "@/controllers/order-controller"
import { authenticateUser, enableCors, requireAdmin } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    switch (req.method) {
      case "GET":
        // Admin only - get all orders
        return new Promise<void>((resolve, reject) => {
          enableCors(req, res, async () => {
          requireAdmin(req, res, async () => {
            try {
              await getOrdersHandler(req, res)
              resolve()
            } catch (error) {
              console.error("Error in getOrders:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing orders request" })
              }
              reject(error)
            }
          })
        })
        })

      case "POST":
        // Authenticated user - create a new order
        return await new Promise<void>((resolve, reject) => {
          authenticateUser(req, res, async () => {
            try {
              await createOrder(req, res)
              resolve()
            } catch (error) {
              console.error("Error in createOrder:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order creation" })
              }
              reject(error)
            }
          })
        })

      default:
        return res.status(405).json({ error: "Method not allowed" })
    }
  } catch (error) {
    console.error("Unhandled error in orders API handler:", error)
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" })
    }
  }
}
