import type { NextApiRequest, NextApiResponse } from "next";
import { getUserOrders } from "../../../models/order";
import { authenticateUser } from "../../../middleware/auth-middleware";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authenticate user before allowing access to orders
  return new Promise<void>((resolve) => {
    authenticateUser(req, res, async () => {
      try {
        //@ts-ignore
        // Get user ID from authenticated user
        const userId = req.user?.id;

        if (!userId) {
          console.log("User not authenticated or user ID missing");
          res.status(401).json({ error: "Unauthorized - User ID not found" });
          return resolve();
        }

        console.log(`Fetching orders for user ID: ${userId}`);
        const orders = await getUserOrders(userId);

        res.status(200).json({ orders });
      } catch (error) {
        console.error("Error getting user orders:", error);
        res.status(500).json({ error: "Internal server error" });
      }
      resolve();
    });
  });
}
