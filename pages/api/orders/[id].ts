import type { NextApiResponse } from "next"
import { enableCors } from "@/middleware/auth-middleware"
import { 
  getOrder, 
  getOrderByNumber,   
  updateOrderStatusHandler,
  updatePaymentStatusHandler,
  deleteOrderHandler 
} from "@/controllers/order-controller"
import { AuthenticatedRequest, Order } from "@/types"

export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  // Only allow GET, PUT, and DELETE methods
  if (!["GET", "PUT", "DELETE"].includes(req.method || "")) {
    res.setHeader("Allow", ["GET", "PUT", "DELETE", "OPTIONS"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" })
    }

    // Authenticate user for all protected routes
    return new Promise<void>((resolve) => {
      enableCors(req, res, async () => {
        try {
          // Check if authentication middleware set the user
          if (!req.user || !req.user.id) {
            console.log("User not authenticated or user ID missing")
            res.status(401).json({ error: "Unauthorized - User not authenticated" })
            return resolve()
          }

          // Handle different HTTP methods
          switch (req.method) {
            case "GET":
              await handleGetOrder(req, res, id as string)
              break

            case "PUT":
              await handlePutOrder(req, res, id as string)
              break

            case "DELETE":
              await handleDeleteOrder(req, res, id as string)
              break

            default:
              res.setHeader("Allow", ["GET", "PUT", "DELETE", "OPTIONS"])
              res.status(405).json({ error: `Method ${req.method} not allowed` })
          }
        } catch (error) {
          console.error(`Error handling ${req.method} request:`, error)
          if (!res.writableEnded) {
            res.status(500).json({ error: "Internal server error" })
          }
        }
        resolve()
      })
    })
  } catch (error) {
    console.error("Error in order handler:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

async function handleGetOrder(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    // Check if the ID starts with "ORD-" (order number format)
    if (id.startsWith("ORD-")) {
      console.log(`Order number format detected: ${id}`)
      // Pass to controller but with additional user validation
      req.query.orderNumber = id // Set the expected query parameter
      await getOrderByNumber(req, res)
    } else {
      // Regular ID based lookup
      console.log(`Fetching order ${id} for user ${req.user!.id}`)
      await getOrder(req, res)
    }

    // After controller response, check permissions if response is still active
    if (!res.writableEnded) {
      const responseData = res.statusCode === 200 ? (res as any)._getJSONData?.() : null
      const order = responseData?.order as Order | undefined
      
      if (order) {
        // Check if the order belongs to the authenticated user or if the user is an admin
        if (String(order.user_id) !== String(req.user!.id) && !req.user!.is_admin) {
          console.log(
            `User ${req.user!.id} is not authorized to access order ${id} belonging to user ${order.user_id}`
          )
          res.status(403).json({ error: "Forbidden - You do not have permission to access this order" })
        }
      }
    }
  } catch (error) {
    console.error("Error getting order:", error)
    if (!res.writableEnded) {
      res.status(500).json({ error: "Internal server error" })
    }
  }
}

async function handlePutOrder(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const { status, paymentStatus } = req.body

    if (status) {
      // Update order status
      await updateOrderStatusHandler(req, res, id)
    } else if (paymentStatus) {
      // Update payment status
      await updatePaymentStatusHandler(req, res, id)
    } else {
      res.status(400).json({ error: "Invalid update data. Either 'status' or 'paymentStatus' is required." })
    }
  } catch (error) {
    console.error("Error updating order:", error)
    if (!res.writableEnded) {
      res.status(500).json({ error: "Internal server error" })
    }
  }
}

async function handleDeleteOrder(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    await deleteOrderHandler(req, res, id)
  } catch (error) {
    console.error("Error deleting order:", error)
    if (!res.writableEnded) {
      res.status(500).json({ error: "Internal server error" })
    }
  }
}