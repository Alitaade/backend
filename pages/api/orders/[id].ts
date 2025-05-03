import type { NextApiRequest, NextApiResponse } from "next";
import { getOrderById, getOrderByOrderNumber } from "../../../models/order";
import { authenticateUser } from "../../../middleware/auth-middleware";

interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: number;
    email: string;
    is_admin: boolean;
  };
}

export default async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Only allow GET and PUT methods
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", ["GET", "PUT", "OPTIONS"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Modify the validation logic for order ID:
    let orderId: number | string = id;
    // Check if the ID starts with "ORD-" (order number format)
    if (typeof id === "string" && id.startsWith("ORD-")) {
      console.log(`Order number format detected: ${id}`);
      // Use the order number instead of trying to convert to a number
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, async () => {
          try {
            // Check if authentication middleware set the user
            if (!req.user || !req.user.id) {
              console.log("User not authenticated or user ID missing");
              res
                .status(401)
                .json({ error: "Unauthorized - User not authenticated" });
              return resolve();
            }

            console.log(`Fetching order by order number ${id}`);

            // Use the getOrderByOrderNumber function instead
            const order = await getOrderByOrderNumber(id as string);
            if (!order) {
              console.log(`Order with number ${id} not found`);
              res.status(404).json({ error: "Order not found" });
              return resolve();
            }

            // Debug log to see the order and user IDs
            console.log(
              `Order user_id: ${order.user_id}, Authenticated user ID: ${req.user.id}`
            );

            // Check if the order belongs to the authenticated user or if the user is an admin
            if (
              String(order.user_id) !== String(req.user.id) &&
              !req.user.is_admin
            ) {
              console.log(
                `User ${req.user.id} is not authorized to access order ${id} belonging to user ${order.user_id}`
              );
              res
                .status(403)
                .json({
                  error:
                    "Forbidden - You do not have permission to access this order",
                });
              return resolve();
            }

            console.log(
              `Successfully returning order ${id} to user ${req.user.id}`
            );
            res.status(200).json({ order });
          } catch (error) {
            console.error("Error getting order:", error);
            res.status(500).json({ error: "Internal server error" });
          }
          resolve();
        });
      });
    } else {
      // Try to parse as a number for ID-based lookups
      orderId = Number(id);
      if (isNaN(orderId)) {
        console.log(
          `Invalid order ID: ${id} is not a number and not an order number format`
        );
        return res.status(400).json({ error: "Invalid order ID format" });
      }
    }

    // For GET requests, authenticate and return order details
    if (req.method === "GET") {
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, async () => {
          try {
            // Check if authentication middleware set the user
            if (!req.user || !req.user.id) {
              console.log("User not authenticated or user ID missing");
              res
                .status(401)
                .json({ error: "Unauthorized - User not authenticated" });
              return resolve();
            }

            console.log(`Fetching order ${orderId} for user ${req.user.id}`);

            const order = await getOrderById(orderId as number);
            if (!order) {
              console.log(`Order ${orderId} not found`);
              res.status(404).json({ error: "Order not found" });
              return resolve();
            }

            // Debug log to see the order and user IDs
            console.log(
              `Order user_id: ${order.user_id}, Authenticated user ID: ${req.user.id}`
            );

            // Check if the order belongs to the authenticated user or if the user is an admin
            // Convert both to strings for comparison to avoid type issues
            if (
              String(order.user_id) !== String(req.user.id) &&
              !req.user.is_admin
            ) {
              console.log(
                `User ${req.user.id} is not authorized to access order ${orderId} belonging to user ${order.user_id}`
              );
              res
                .status(403)
                .json({
                  error:
                    "Forbidden - You do not have permission to access this order",
                });
              return resolve();
            }

            console.log(
              `Successfully returning order ${orderId} to user ${req.user.id}`
            );
            res.status(200).json({ order });
          } catch (error) {
            console.error("Error getting order:", error);
            res.status(500).json({ error: "Internal server error" });
          }
          resolve();
        });
      });
    }

    // Handle PUT requests (for updating orders) here if needed
    // ...
  } catch (error) {
    console.error("Error in order handler:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
