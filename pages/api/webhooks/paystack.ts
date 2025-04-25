import type { NextApiRequest, NextApiResponse } from "next";
import {
  getOrderByPaymentReference,
  updateOrderPaymentStatus,
  updateOrderStatus,
  getOrderByOrderNumber,
} from "../../../models/order";
import crypto from "crypto";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Log the incoming webhook
    console.log(
      "Received Paystack webhook:",
      JSON.stringify(req.body, null, 2)
    );

    // Verify webhook signature if available
    if (
      process.env.PAYSTACK_SECRET_KEY &&
      req.headers["x-paystack-signature"]
    ) {
      const hash = crypto
        .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (hash !== req.headers["x-paystack-signature"]) {
        console.error("Invalid Paystack webhook signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    } else {
      console.log(
        "Skipping signature verification - no secret key or signature header"
      );
    }

    // Process the webhook
    const event = req.body;
    console.log(`Processing Paystack webhook: ${event.event}`);

    // Handle successful charge
    if (event.event === "charge.success") {
      const reference = event.data.reference;
      console.log(`Processing successful payment for reference: ${reference}`);

      // Find the order by payment reference
      const order = await getOrderByPaymentReference(reference);

      if (order) {
        console.log(
          `Found order ${order.id} for payment reference ${reference}`
        );

        // Update order payment status
        await updateOrderPaymentStatus(order.id, "completed", reference);
        console.log(
          `Updated payment status to 'completed' for order ${order.id}`
        );

        // Also update the order status to processing if it was pending
        if (order.status === "pending") {
          await updateOrderStatus(order.id, "processing");
          console.log(
            `Updated order status to 'processing' for order ${order.id}`
          );
        }
      } else {
        console.error(`Order not found for payment reference: ${reference}`);

        // Try to extract order number from reference (common format: ORDER-{orderNumber}-{timestamp})
        const orderIdMatch = reference.match(/ORDER-([^-]+)-/);
        if (orderIdMatch && orderIdMatch[1]) {
          const orderByNumber = await getOrderByOrderNumber(orderIdMatch[1]);
          if (orderByNumber) {
            console.log(
              `Found order by extracted order number: ${orderByNumber.id}`
            );

            // Update the order with the payment reference
            await updateOrderPaymentStatus(
              orderByNumber.id,
              "completed",
              reference
            );
            console.log(
              `Updated payment status to 'completed' for order ${orderByNumber.id} (found by order number)`
            );

            // Also update the order status to processing if it was pending
            if (orderByNumber.status === "pending") {
              await updateOrderStatus(orderByNumber.id, "processing");
              console.log(
                `Updated order status to 'processing' for order ${orderByNumber.id}`
              );
            }
          } else {
            console.error(
              `Order not found by extracted order number: ${orderIdMatch[1]}`
            );
          }
        }
      }
    }

    // Return success
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
