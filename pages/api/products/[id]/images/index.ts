// File 1: Image upload handler (for binary/form uploads)
import type { NextApiRequest, NextApiResponse } from "next"
import { processUpload } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"


// Disable Next.js body parser for FormData handling
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse
) {
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  // Log the request details for debugging
  console.log(`Received ${req.method} request to ${req.url}`)
  console.log("Content-Type:", req.headers["content-type"])

  // Log additional headers for octet-stream uploads
  if (req.headers["content-type"]?.includes("application/octet-stream")) {
    console.log("Content-Disposition:", req.headers["content-disposition"])
    console.log("X-File-Name:", req.headers["x-file-name"])
    console.log("X-File-Size:", req.headers["x-file-size"])
    console.log("X-File-Type:", req.headers["x-file-type"])
  }

  switch (req.method) {
    case "POST":
    case "PUT":
      // Admin only - process upload
      return await new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, async () => {
            try {
              // Process the upload - handles both JSON and FormData
              await processUpload(req, res);
              resolve();
            } catch (error: any) {
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