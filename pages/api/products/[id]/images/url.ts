// File 2: URL image upload handler
import type { NextApiRequest, NextApiResponse } from "next"
import { handleUrlUpload } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  switch (req.method) {
    case "POST":
      // Admin only - add an image by URL
      return await new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, async () => {
            try {
              // Process URL upload
              await handleUrlUpload(req, res);
              resolve();
            } catch (error: any) {
              console.error("Error in URL image upload handler:", error);
              
              // Only send error if headers haven't been sent
              if (!res.writableEnded) {
                res.status(500).json({
                  error: "Failed to process image URL",
                  message: error.message || "Unknown error",
                });
              }
              resolve();
            }
          });
        });
      });

    default:
      return res.status(405).json({ error: "Method not allowed" });
  }
}