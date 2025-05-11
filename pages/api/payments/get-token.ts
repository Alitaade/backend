import type { NextApiRequest, NextApiResponse } from "next";
import { getTokenForOrder } from "../../../models/token";
import { applyMiddleware } from "../../../middleware/api-security";
import { allowedOrigins } from "../../../middleware/origins";

/**
 * API handler to retrieve a token for a specific order
 * @param {NextApiRequest} req - The Next.js API request
 * @param {NextApiResponse} res - The Next.js API response
 * @returns {Promise<void>}
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  await handleCors(req, res);

  try {
    const { orderNumber } = req.query;

    if (!orderNumber) {
      return res.status(400).json({ error: "Order number is required" });
    }

    // Get the token for this order
    const token = await getTokenForOrder(orderNumber as string);

    if (!token) {
      return res
        .status(404)
        .json({ error: "No valid token found for this order" });
    }

    return res.status(200).json({
      token,
      message: "Token retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting token:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Helper function to handle CORS headers
 * @param {NextApiRequest} req - The Next.js API request
 * @param {NextApiResponse} res - The Next.js API response
 */
function handleCors(req: NextApiRequest, res: NextApiResponse) {
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
}

// Wrap the handler with auth middleware
export default applyMiddleware(handler);