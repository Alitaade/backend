// pages/api/orders/[id]/items/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../../../database/connection"
import { authenticateUser, requireAdmin } from "../../../../../middleware/auth-middleware"

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
              await getOrderItemsHandler(req, res, id);
              resolve();
            } catch (error) {
              console.error("Error in getOrderItems:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order items request" });
              }
              reject(error);
            }
          });
        });

      default:
        res.setHeader("Allow", ["GET", "OPTIONS"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in order items API handler:", error);
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

async function getOrderItemsHandler(req: NextApiRequest, res: NextApiResponse, orderId: string) {
  try {
    // First, check if the order exists
    const orderCheck = await query(
      "SELECT id FROM orders WHERE id = $1",
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Get order items with product information
    const itemsResult = await query(
      `
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
      ORDER BY oi.created_at ASC
      `,
      [orderId]
    );

    return res.status(200).json({ items: itemsResult.rows });
  } catch (error) {
    console.error("Error fetching order items:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}