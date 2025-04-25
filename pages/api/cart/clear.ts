import type { NextApiRequest, NextApiResponse } from "next";
import { clear } from "../../../controllers/cart-controller";
import { authenticateUser } from "../../../middleware/auth-middleware";
import { corsMiddleware } from "../../../middleware/api-security";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle OPTIONS requests for CORS preflight
  if (req.method === "OPTIONS") {
    corsMiddleware(req, res, () => {
      res.status(200).end();
    });
    return;
  }

  switch (req.method) {
    case "DELETE":
      // Apply CORS first
      return new Promise<void>((resolve) => {
        corsMiddleware(req, res, () => {
          // Then authenticate user
          authenticateUser(req, res, () => {
            clear(req, res).finally(() => resolve());
          });
        });
      });

    default:
      // Apply CORS for non-supported methods too
      corsMiddleware(req, res, () => {
        res.status(405).json({ error: "Method not allowed" });
      });
      return;
  }
}
