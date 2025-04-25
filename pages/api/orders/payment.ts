import type { NextApiRequest, NextApiResponse } from "next";
import {
  updateOrderPaymentStatus,
  updateOrderStatus,
  getOrderById,
} from "../../../models/order";
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
    res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Only allow PUT method
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { paymentStatus, paymentReference } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    if (!paymentStatus) {
      return res.status(400).json({ error: "Payment status is required" });
    }

    // Validate that id is a valid number
    const orderId = Number(id);
    if (isNaN(orderId)) {
      console.log(`Invalid order ID: ${id} is not a number`);
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    // Authenticate user before allowing update
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

          console.log(
            `Updating payment status for order ${orderId} by user ${req.user.id}`
          );

          // Get the order to check ownership
          const order = await getOrderById(orderId);
          if (!order) {
            console.log(`Order ${orderId} not found`);
            res.status(404).json({ error: "Order not found" });
            return resolve();
          }

          // Check if the order belongs to the authenticated user or if the user is an admin
          if (
            String(order.user_id) !== String(req.user.id) &&
            !req.user.is_admin
          ) {
            console.log(
              `User ${req.user.id} is not authorized to update order ${orderId} belonging to user ${order.user_id}`
            );
            res
              .status(403)
              .json({
                error:
                  "Forbidden - You do not have permission to update this order",
              });
            return resolve();
          }

          // Update order payment status
          const updatedOrder = await updateOrderPaymentStatus(
            orderId,
            paymentStatus,
            paymentReference
          );

          // If payment is completed, also update order status to processing if it's pending
          if (paymentStatus === "completed" && order.status === "pending") {
            await updateOrderStatus(orderId, "processing");
            console.log(
              `Updated order status to 'processing' for order ${orderId}`
            );
          }

          console.log(
            `Successfully updated payment status to '${paymentStatus}' for order ${orderId}`
          );
          res.status(200).json({
            message: "Order payment status updated successfully",
            order: updatedOrder,
          });
        } catch (error) {
          console.error("Error updating order payment status:", error);
          res.status(500).json({ error: "Internal server error" });
        }
        resolve();
      });
    });
  } catch (error) {
    console.error("Error in payment status update handler:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
