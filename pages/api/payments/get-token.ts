import type { NextApiRequest, NextApiResponse } from "next";
import { getTokenForOrder } from "../../../models/token";
import { applyMiddleware } from "../../../middleware/api-security";

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
  const allowedOrigins = [
    "https://onlu.vercel.app",
    "https://www.onlu.vercel.app",
    "https://pro-project-gilt.vercel.app",
    "https://www.pro-project-gilt.vercel.app",
  ];

  // Add localhost for development
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.push("http://localhost:3000");
    allowedOrigins.push("http://localhost:3001");
  }

  // Check if the origin is allowed
  if (
    allowedOrigins.includes(origin) ||
    process.env.NODE_ENV === "development"
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
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
