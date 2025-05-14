// Updated API endpoint handler for JSON-only uploads
// pages/api/products/[id]/images/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { processUpload } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  // Log the request for debugging
  console.log(`Received ${req.method} request to ${req.url}`);

  switch (req.method) {
    case "POST":
    case "PUT":
    case "OPTIONS":
      // Admin only - process upload
      return new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, async () => {
            try {
              // Check content type for JSON
              const contentType = req.headers["content-type"] || "";
              console.log("Content-Type header:", contentType);
              
              if (!contentType.includes('application/json')) {
                res.status(415).json({ 
                  error: "Unsupported Media Type", 
                  message: "Only JSON payloads are supported" 
                });
                return resolve();
              }
              
              // Process the upload - JSON only
              await processUpload(req, res);
              resolve();
            } catch (error) {
              console.error("Error in image upload handler:", error);
              
              // Only send error if headers haven't been sent
              if (!res.writableEnded) {
                res.status(500).json({
                  error: "Failed to process images",
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