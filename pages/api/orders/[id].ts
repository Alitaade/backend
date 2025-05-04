import type { NextApiResponse } from "next"
import { authenticateUser } from "@/middleware/auth-middleware"
import { getOrder, getOrderByNumber } from "@/controllers/order-controller" // Import your controllers
import { AuthenticatedRequest, Order } from "@/types" // Import types from your types file

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  // Only allow GET and PUT methods
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", ["GET", "PUT", "OPTIONS"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" })
    }

    // For GET requests, authenticate and return order details
    if (req.method === "GET") {
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, async () => {
          try {
            // Check if authentication middleware set the user
            if (!req.user || !req.user.id) {
              console.log("User not authenticated or user ID missing")
              res.status(401).json({ error: "Unauthorized - User not authenticated" })
              return resolve()
            }

            // Check if the ID starts with "ORD-" (order number format)
            if (typeof id === "string" && id.startsWith("ORD-")) {
              console.log(`Order number format detected: ${id}`)
              // Pass to controller but with additional user validation
              req.query.orderNumber = id // Set the expected query parameter
              await getOrderByNumber(req, res)
              
              // After controller response, check if we can access the response
              // If the controller didn't end the response, we need to verify permissions
              if (!res.writableEnded) {
                const responseData = res.statusCode === 200 ? (res as any)._getJSONData?.() : null
                const order = responseData?.order as Order | undefined
                
                if (order) {
                  // Check if the order belongs to the authenticated user or if the user is an admin
                  if (String(order.user_id) !== String(req.user.id) && !req.user.is_admin) {
                    console.log(
                      `User ${req.user.id} is not authorized to access order ${id} belonging to user ${order.user_id}`,
                    )
                    res.status(403).json({ error: "Forbidden - You do not have permission to access this order" })
                  }
                }
              }
            } else {
              // Regular ID based lookup
              console.log(`Fetching order ${id} for user ${req.user.id}`)
              await getOrder(req, res)
              
              // After controller response, check if we can access the response
              // If the controller didn't end the response, we need to verify permissions
              if (!res.writableEnded) {
                const responseData = res.statusCode === 200 ? (res as any)._getJSONData?.() : null
                const order = responseData?.order as Order | undefined
                
                if (order) {
                  // Check if the order belongs to the authenticated user or if the user is an admin
                  if (String(order.user_id) !== String(req.user.id) && !req.user.is_admin) {
                    console.log(
                      `User ${req.user.id} is not authorized to access order ${id} belonging to user ${order.user_id}`,
                    )
                    res.status(403).json({ error: "Forbidden - You do not have permission to access this order" })
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error getting order:", error)
            if (!res.writableEnded) {
              res.status(500).json({ error: "Internal server error" })
            }
          }
          resolve()
        })
      })
    }

    // Handle PUT requests (for updating orders) here if needed
    // ...
  } catch (error) {
    console.error("Error in order handler:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}