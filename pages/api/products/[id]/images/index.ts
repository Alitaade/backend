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
  
  // Match the working pattern - Use enableCors first, before handling any methods
  return new Promise<void>((resolve, reject) => {
    enableCors(req, res, async () => {
      try {
        // Now handle methods after CORS is properly set up
        switch (req.method) {
          case "OPTIONS":
            // The enableCors middleware should have handled this already
            return res.status(200).end();
            
          case "POST": {
            // Admin only - add multiple images to a product
            requireAdmin(req, res, async () => {
              try {
                // Acknowledge receipt immediately
                if (!res.headersSent) {
                  res.writeHead(202, {
                    'Content-Type': 'application/json',
                  });
                  res.write(JSON.stringify({
                    status: "received",
                    message: "Upload received. Processing images...",
                  }));
                }
                
                // Process the images
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
            break;
          }
          
          default:
            res.status(405).json({ error: "Method not allowed" });
            resolve();
        }
      } catch (error) {
        console.error("Error handling request:", error);
        if (!res.headersSent) {
          res.status(500).json({ 
            error: "Internal server error",
            message: error.message || "Unknown error" 
          });
        }
        resolve();
      }
    });
  });
}