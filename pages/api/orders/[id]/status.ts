// pages/api/orders/[id]/status.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../../database/connection"
import { requireAdmin } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid order ID" });
  }

  try {
    switch (req.method) {
      case "PUT":
        return new Promise<void>((resolve, reject) => {
          requireAdmin(req, res, async () => {
            try {
              await updateOrderStatusHandler(req, res, id);
              resolve();
            } catch (error) {
              console.error("Error in updateOrderStatus:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing status update" });
              }
              reject(error);
            }
          });
        });

      default:
        res.setHeader("Allow", ["PUT", "OPTIONS"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in order status API handler:", error);
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

async function updateOrderStatusHandler(req: NextApiRequest, res: NextApiResponse, orderId: string) {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be one of: pending, processing, shipped, delivered, cancelled" });
    }

    // Update order status
    const result = await query(
      `
      UPDATE orders 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING id, order_number, status
      `,
      [status, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({
      message: "Order status updated successfully",
      order: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}