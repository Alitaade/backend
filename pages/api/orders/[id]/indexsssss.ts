// pages/api/orders/[id]/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../../database/connection"
import { authenticateUser, requireAdmin } from "../../../../middleware/auth-middleware"

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
      case "GET":
        return new Promise<void>((resolve, reject) => {
          authenticateUser(req, res, async () => {
            try {
              await getOrderDetailsHandler(req, res, id);
              resolve();
            } catch (error) {
              console.error("Error in getOrderDetails:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order details request" });
              }
              reject(error);
            }
          });
        });

      case "DELETE":
        return new Promise<void>((resolve, reject) => {
          requireAdmin(req, res, async () => {
            try {
              await deleteOrderHandler(req, res, id);
              resolve();
            } catch (error) {
              console.error("Error in deleteOrder:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order deletion" });
              }
              reject(error);
            }
          });
        });

      default:
        res.setHeader("Allow", ["GET", "DELETE", "OPTIONS"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in order details API handler:", error);
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

async function getOrderDetailsHandler(req: NextApiRequest, res: NextApiResponse, orderId: string) {
  try {
    // Get order details
    const orderResult = await query(
      `
      SELECT o.*, 
             u.first_name, u.last_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
      `,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    // Format response with user info
    const formattedOrder = {
      ...order,
      user: {
        first_name: order.first_name,
        last_name: order.last_name,
        email: order.email,
      },
    };

    return res.status(200).json(formattedOrder);
  } catch (error) {
    console.error("Error fetching order details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function deleteOrderHandler(req: NextApiRequest, res: NextApiResponse, orderId: string) {
  try {
    // Begin transaction
    await query('BEGIN');

    // Delete order items first (cascade should handle this, but being explicit)
    await query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    
    // Delete the order
    const result = await query('DELETE FROM orders WHERE id = $1 RETURNING *', [orderId]);
    
    // Commit transaction
    await query('COMMIT');

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    console.error("Error deleting order:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}