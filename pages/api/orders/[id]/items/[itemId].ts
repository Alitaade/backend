// pages/api/orders/[id]/items/[itemId].ts
import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../../../database/connection"
import { requireAdmin } from "../../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { id, itemId } = req.query;
  if (!id || Array.isArray(id) || !itemId || Array.isArray(itemId)) {
    return res.status(400).json({ error: "Invalid order or item ID" });
  }

  try {
    switch (req.method) {
      case "DELETE":
        return new Promise<void>((resolve, reject) => {
          requireAdmin(req, res, async () => {
            try {
              await deleteOrderItemHandler(req, res, id, itemId);
              resolve();
            } catch (error) {
              console.error("Error in deleteOrderItem:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order item deletion" });
              }
              reject(error);
            }
          });
        });

      default:
        res.setHeader("Allow", ["DELETE", "OPTIONS"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in order item API handler:", error);
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

async function deleteOrderItemHandler(req: NextApiRequest, res: NextApiResponse, orderId: string, itemId: string) {
  try {
    // Begin transaction
    await query('BEGIN');

    // First, get the item details to calculate order total adjustment
    const itemResult = await query(
      `SELECT price, quantity FROM order_items WHERE id = $1 AND order_id = $2`,
      [itemId, orderId]
    );

    if (itemResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: "Order item not found" });
    }

    const item = itemResult.rows[0];
    const itemTotal = parseFloat(item.price) * item.quantity;

    // Delete the order item
    await query(
      `DELETE FROM order_items WHERE id = $1 AND order_id = $2`,
      [itemId, orderId]
    );

    // Update the order's total amount
    await query(
      `UPDATE orders SET total_amount = total_amount - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [itemTotal, orderId]
    );

    // Check if any items remain
    const remainingItemsResult = await query(
      `SELECT COUNT(*) as count FROM order_items WHERE order_id = $1`,
      [orderId]
    );

    const remainingItemsCount = parseInt(remainingItemsResult.rows[0].count);

    // If this was the last item, consider changing order status
    if (remainingItemsCount === 0) {
      await query(
        `UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [orderId]
      );
    }

    // Commit transaction
    await query('COMMIT');

    return res.status(200).json({ 
      message: "Order item deleted successfully",
      updatedOrderTotal: remainingItemsCount === 0 ? 0 : null
    });
    
  } catch (error) {
    // Rollback transaction on error
    await query('ROLLBACK');
    console.error("Error deleting order item:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}