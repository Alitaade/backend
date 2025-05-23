import type { NextApiRequest, NextApiResponse } from "next"
import { createOrder, createOrderAdmin, getOrdersHandler } from "../../../controllers/order-controller"
import { authenticateUser, requireAdmin } from "../../../middleware/auth-middleware"

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

      case "POST":
        // Check if request is from admin panel
        const isAdmin = req.headers["x-admin-request"] === "true"

        if (isAdmin) {
          // Admin creating an order
          return new Promise<void>((resolve, reject) => {
            requireAdmin(req, res, async () => {
              try {
                await createOrderAdmin(req, res)
                resolve()
              } catch (error) {
                console.error("Error in createOrderAdmin:", error)
                if (!res.writableEnded) {
                  res.status(500).json({ error: "Server error processing admin order creation" })
                }
                reject(error)
              }
            })
          })
        } else {
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
        }

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
