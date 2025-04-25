import type { NextApiRequest, NextApiResponse } from "next";
import { createOrder, getOrder } from "../../../controllers/order-controller";
import {
  authenticateUser,
  requireAdmin,
} from "../../../middleware/auth-middleware";

// Helper function to set CORS headers consistently
const setCorsHeaders = (res: NextApiResponse) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.ALLOWED_ORIGINS || "*"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.setHeader("Access-Control-Max-Age", "86400"); // 24-hour cache for preflight
    return res.status(204).end();
  }

  // Set CORS headers for all responses
  setCorsHeaders(res);

  try {
    switch (req.method) {
      case "GET":
        // Admin only - get all orders
        return await new Promise<void>((resolve, reject) => {
          requireAdmin(req, res, async () => {
            try {
              await getOrder(req, res);
              resolve();
            } catch (error) {
              console.error("Error in getOrders:", error);
              if (!res.writableEnded) {
                res
                  .status(500)
                  .json({ error: "Server error processing orders request" });
              }
              reject(error);
            }
          });
        });

      case "POST":
        // Authenticated user - create a new order
        return await new Promise<void>((resolve, reject) => {
          authenticateUser(req, res, async () => {
            try {
              await createOrder(req, res);
              resolve();
            } catch (error) {
              console.error("Error in createOrder:", error);
              if (!res.writableEnded) {
                res
                  .status(500)
                  .json({ error: "Server error processing order creation" });
              }
              reject(error);
            }
          });
        });

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in orders API handler:", error);
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
