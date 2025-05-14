import type { NextApiRequest, NextApiResponse } from "next"
import { handleSingleImageUpload } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"
// Disable Next.js body parser for FormData handling
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }
  // Handle preflight OPTIONS request
  console.log(`Received ${req.method} request to ${req.url}`);
  // Log content type for debugging
  console.log("Content-Type header:", req.headers["content-type"]);

  switch (req.method) {
    case "POST":
    case "PUT":
      // Admin only - process single image upload
      return new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, async () => {
            try {
              // Handle single file upload - optimized for FormData
              await handleSingleImageUpload(req, res);
              resolve();
            } catch (error) {
              console.error("Error in single image upload handler:", error);
              
              // Only send error if headers haven't been sent
              if (!res.writableEnded) {
                res.status(500).json({
                  error: "Failed to process image",
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