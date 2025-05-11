import type { NextApiRequest, NextApiResponse } from "next";
import { verifyToken, getTokenUsageInfo } from "../../../models/token";
import { getOrderByOrderNumber } from "../../../models/order";
import { allowedOrigins } from "../../../middleware/origins";

// Define the handler function
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS using the centralized configuration
  const origin = req.headers.origin || "";
  
  // Check if the origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // Fallback to the first allowed origin
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0] || "");
  }

  // Set other CORS headers
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key, x-api-key"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Log the entire request body for debugging
    console.log("Request body:", JSON.stringify(req.body));

    const { orderNumber, token } = req.body;

    console.log(
      `Extracted from request: orderNumber=${orderNumber}, token=${token}`
    );

    if (!orderNumber || !token) {
      console.log(
        `Error: Missing required parameters. orderNumber=${orderNumber}, token=${token}`
      );
      return res.status(400).json({
        error: "Order number and token are required",
        valid: false,
        details: {
          receivedOrderNumber: orderNumber || "undefined",
          receivedToken: token ? "provided" : "undefined",
        },
      });
    }

    // Get token usage information
    const tokenUsage = await getTokenUsageInfo(token);
    console.log(`Token usage info: ${JSON.stringify(tokenUsage)}`);

    // Verify the token
    console.log(`Attempting to verify token for order: ${orderNumber}`);
    const isValid = await verifyToken(orderNumber, token);
    console.log(`Token verification result for ${orderNumber}: ${isValid}`);

    if (!isValid) {
      return res.status(200).json({
        valid: false,
        message: "Invalid or expired token",
        tokenUsage: tokenUsage || { usageCount: 0, maxUses: 3 },
      });
    }

    // Get the order details
    const order = await getOrderByOrderNumber(orderNumber);
    if (!order) {
      console.log(`Error: Order not found for order number: ${orderNumber}`);
      return res.status(200).json({
        valid: true,
        message: "Token verified successfully, but order not found",
        order: null,
        tokenUsage: tokenUsage || { usageCount: 1, maxUses: 3 },
      });
    }

    // Clean up sensitive information before sending the order
    const safeOrder = {
      ...order,
      // Remove any sensitive fields if needed
      // payment_reference: undefined,
    };

    console.log(
      `Order found with ID: ${order.id} for order number: ${orderNumber}`
    );
    return res.status(200).json({
      valid: true,
      message: "Token verified successfully",
      order: safeOrder,
      tokenUsage: tokenUsage || { usageCount: 1, maxUses: 3 },
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(500).json({
      error: "Internal server error",
      valid: false,
    });
  }
}

// Export the handler directly without middleware
export default handler;