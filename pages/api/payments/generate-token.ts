import type { NextApiRequest, NextApiResponse } from "next";
import { createVerificationToken } from "../../../models/token";
import { getOrderByNumber } from "@/controllers/order-controller";
import { applyMiddleware } from "../../../middleware/api-security";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderNumber } = req.body;
    console.log(`Generating token for order number: ${orderNumber}`);

    if (!orderNumber) {
      console.log("Error: Order number is required");
      return res.status(400).json({
        error: "Order number is required",
      });
    }
    req.query.id = orderNumber.toString();
    // Get the order to verify it exists and get the ID
    const order = await getOrderByNumber(req, res);
    if (!order) {
      console.log(`Error: Order not found for order number: ${orderNumber}`);
      return res.status(404).json({
        error: "Order not found",
      });
    }

    console.log(
      `Found order with ID ${order.id} for order number ${orderNumber}`
    );

    // Generate a verification token
    const token = await createVerificationToken(order.id, order.order_number);
    console.log(`Generated token: ${token.token} for order ${order.id}`);

    return res.status(200).json({
      message: "Token generated successfully",
      token: token.token,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (error) {
    console.error("Error generating token:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

export default applyMiddleware(handler);
