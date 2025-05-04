// pages/api/orders/[id]/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { authenticateUser, requireAdmin, enableCors } from "../../../../middleware/auth-middleware"
import { getOrderDetailsHandler, deleteOrderHandler } from "@/controllers/order-controller"
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
              await getOrderDetailsHandler(req, res, id);
              resolve();
            } catch (error) {
              console.error("Error in getOrderDetails:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order details request" });
              }
              reject(error);
            }
          });
        });

      case "DELETE":
        return new Promise<void>((resolve, reject) => {
          enableCors(req, res, async () => {
          requireAdmin(req, res, async () => {
            try {
              await deleteOrderHandler(req, res, id);
              resolve();
            } catch (error) {
              console.error("Error in deleteOrder:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing order deletion" });
              }
              reject(error);
            }
          })
        })
        });

      default:
        res.setHeader("Allow", ["GET", "DELETE", "OPTIONS"]);
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in order details API handler:", error);
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
