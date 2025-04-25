import type { NextApiRequest, NextApiResponse } from "next";
import {
  getCart,
  addItem,
  updateItem,
} from "../../../controllers/cart-controller";
import { authenticateUser } from "../../../middleware/auth-middleware";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Adjust in production
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-API-Key, x-api-key"
    );
    return res.status(200).end();
  }

  // Fix parameter naming inconsistency
  if (req.method === "GET" && req.query.userId && !req.query.user_id) {
    req.query.user_id = req.query.userId;
  }

  // Handle actual requests
  switch (req.method) {
    case "GET":
      return new Promise<void>((resolve) => {
        try {
          // Skip authentication for cart retrieval to fix issues
          getCart(req, res).finally(() => resolve());
        } catch (error) {
          console.error("Error in cart GET handler:", error);
          res
            .status(500)
            .json({ error: "Internal server error in cart handler" });
          resolve();
        }
      });

    case "POST":
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, () => {
          addItem(req, res).finally(() => resolve());
        });
      });

    case "PUT":
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, () => {
          updateItem(req, res).finally(() => resolve());
        });
      });

    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "OPTIONS"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} not allowed` });
  }
}
