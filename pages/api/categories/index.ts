import type { NextApiRequest, NextApiResponse } from "next";
import {
  getCategories,
  createNewCategory,
} from "../../../controllers/category-controller";
import { requireAdmin } from "../../../middleware/auth-middleware";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Replace with specific origins in production
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Handle actual requests
  switch (req.method) {
    case "GET":
      // Public endpoint - get all categories
      try {
        return await getCategories(req, res);
      } catch (error) {
        console.error("Error fetching categories:", error);
        return res.status(500).json({ error: "Internal server error" });
      }

    case "POST":
      // Admin only - create a new category
      return new Promise<void>((resolve) => {
        requireAdmin(req, res, () => {
          createNewCategory(req, res)
            .catch((error) => {
              console.error("Error creating category:", error);
              if (!res.headersSent) {
                res.status(500).json({ error: "Failed to create category" });
              }
            })
            .finally(() => resolve());
        });
      });

    default:
      res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
      return res.status(405).json({
        error: `Method ${req.method} not allowed`,
        allowedMethods: ["GET", "POST"],
      });
  }
}
