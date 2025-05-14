// Updated API endpoint handler for JSON-only uploads
// pages/api/products/[id]/images/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { processUpload } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"

export const config = {
  api: {
    // Increase limits for handling large images in JSON format
    bodyParser: {
      sizeLimit: '20mb' // Adjust based on your needs
    },
    responseLimit: "20mb",
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle preflight request explicitly with all needed headers
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Max-Age", "86400") // 24 hours
    return res.status(200).end()
  }

  // For non-OPTIONS requests, use the enableCors middleware
  return new Promise((resolve) => {
    enableCors(req, res, async () => {
      try {
        // Accept both POST and PUT for flexibility
        if (req.method === "POST" || req.method === "PUT") {
          // Admin only - add multiple images to a product
          requireAdmin(req, res, async () => {
            try {
              // Check content type
              const contentType = req.headers["content-type"] || "";
              
              if (!contentType.includes('application/json')) {
                res.status(415).json({ 
                  error: "Unsupported Media Type", 
                  message: "Only JSON payloads are supported" 
                });
                return resolve(undefined);
              }
              
              // Process the upload - JSON only
              await processUpload(req, res);
              
              // Resolve the promise
              resolve(undefined);
            } catch (error) {
              console.error("Error in image upload handler:", error);
              
              // Only send error if headers haven't been sent
              if (!res.writableEnded) {
                res.status(500).json({
                  error: "Failed to process images",
                  message: error.message || "Unknown error",
                });
              }
              resolve(undefined);
            }
          });
        } else {
          res.status(405).json({ error: "Method not allowed" });
          resolve(undefined);
        }
      } catch (error) {
        console.error("Error handling request:", error);
        if (!res.writableEnded) {
          res.status(500).json({
            error: "Internal server error",
            message: error.message || "Unknown error",
          });
        }
        resolve(undefined);
      }
    });
  });
}