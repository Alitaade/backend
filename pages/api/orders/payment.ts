// pages/api/orders/update-payment-status.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { authenticateUser } from "../../../middleware/auth-middleware"
import { updateOrderPaymentStatusAdmin } from "@/controllers/order-controller"
import { AuthenticatedRequest} from "@/types" 


export default async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Only allow PUT method
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    return new Promise<void>((resolve) => {
      authenticateUser(req, res, async () => {
        try {
          await updateOrderPaymentStatusAdmin(req, res);
          resolve();
        } catch (error) {
          console.error("Error in payment status update handler:", error);
          if (!res.writableEnded) {
            res.status(500).json({ error: "Internal server error" });
          }
          resolve();
        }
      });
    });
  } catch (error) {
    console.error("Error in payment status update handler:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}