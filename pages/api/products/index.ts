import type { NextApiRequest, NextApiResponse } from "next";
import {
  getProducts,
  getProduct,
  createNewProduct,
  // other controller functions...
} from "../../../controllers/product-controller";
import { requireAdmin } from "../../../middleware/auth-middleware";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  try {
    // Normalize query parameters - map 'category' to 'category_id' if it exists
    if (req.query.category && !req.query.category_id) {
      req.query.category_id = req.query.category;
    }
    
    console.log("Normalized query parameters:", req.query);

    switch (req.method) {
      case "GET":
        // Public endpoint - get all products
        console.log("GET /products request received with query:", req.query);
        await getProducts(req, res);
        break;

      case "POST":
        // Admin only - create a new product
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, async () => {
            try {
              await createNewProduct(req, res);
            } catch (error) {
              console.error("Error in createNewProduct:", error);
              if (!res.writableEnded) {
                res.status(500).json({ error: "Internal server error" });
              }
            } finally {
              resolve();
            }
          });
        });

      default:
        res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Unhandled error in products handler:", error);
    if (!res.writableEnded) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}