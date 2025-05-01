// pages/api/orders/[id]/payment-status.ts
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
              await updatePaymentStatusHandler(req, res, id);
              resolve();
            } catch (error) {
              console.error("Error in updatePaymentStatus:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing payment status update" });
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
    console.error("Unhandled error in payment status API handler:", error);
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

async function updatePaymentStatusHandler(req: NextApiRequest, res: NextApiResponse, orderId: string) {
  try {
    const { paymentStatus } = req.body;

    // Validate payment status
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ error: "Invalid payment status. Must be one of: pending, paid, failed, refunded" });
    }

    // Update fields based on payment status
    let updateFields = "payment_status = $1, updated_at = CURRENT_TIMESTAMP";
    const queryParams = [paymentStatus, orderId];
    
    // If status is changing to 'paid', update payment date
    if (paymentStatus === 'paid') {
      updateFields += ", payment_date = CURRENT_TIMESTAMP";
    }

    // Update order payment status
    const result = await query(
      `
      UPDATE orders 
      SET ${updateFields}
      WHERE id = $2
      RETURNING id, order_number, payment_status, payment_date
      `,
      queryParams
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.status(200).json({
      message: "Payment status updated successfully",
      order: result.rows[0]
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}