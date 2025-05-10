// pages/api/products/[id]/images/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { addMultipleImages } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"

// Update the config to properly handle multipart/form-data
export const config = {
  api: {
    bodyParser: false, // Disable the built-in parser for file uploads
    responseLimit: '50mb', // Increased limit for larger response sizes
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set a longer timeout for the response
  res.socket.setTimeout(600000); // 10 minutes
  
  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*") // Replace with specific origin in production
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }
 
  try {
    switch (req.method) {
      case "POST": {
        // Admin only - add multiple images to a product
        await new Promise<void>((resolve, reject) => {
          enableCors(req, res, async () => {
            requireAdmin(req, res, async () => {
              try {
                // Acknowledge receipt immediately
                // The frontend should be designed to handle this
                // For large uploads, sending early response helps prevent timeout
                if (!res.headersSent) {
                  res.writeHead(202, {
                    'Content-Type': 'application/json',
                  });
                  res.write(JSON.stringify({
                    status: "received",
                    message: "Upload received. Processing images...",
                  }));
                }
                
                // Process the images - don't await, just let it run
                addMultipleImages(req, res)
                  .catch(error => {
                    console.error("Background processing error:", error);
                  });
                
                resolve();
              } catch (error) {
                console.error("Error in image upload handler:", error);
                reject(error);
              }
            });
          });
        });
        break;
      }
      default:
        res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Error handling request:", error);
    // Only send an error response if one hasn't been sent already
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Internal server error",
        message: error.message || "Unknown error" 
      });
    }
  }
}