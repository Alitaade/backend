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
  
  console.log(`[DEBUG] Request received: ${req.method} to ${req.url}`);
  console.log(`[DEBUG] Headers:`, req.headers);

  // Handle preflight request explicitly with all needed headers
  if (req.method === "OPTIONS") {
    console.log("[DEBUG] Handling OPTIONS request");
    
    // Set CORS headers explicitly for preflight
    res.setHeader("Access-Control-Allow-Origin", "https://admin-frontends.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
    
    console.log("[DEBUG] CORS headers set for OPTIONS");
    return res.status(200).end();
  }
  
  // For non-OPTIONS requests, use the enableCors middleware
  return new Promise<void>((resolve, reject) => {
    console.log(`[DEBUG] Calling enableCors for ${req.method}`);
    
    enableCors(req, res, async () => {
      console.log(`[DEBUG] Inside enableCors callback`);
      
      try {
        switch (req.method) {
          case "POST": {
            console.log("[DEBUG] Processing POST request");
            
            // Admin only - add multiple images to a product
            requireAdmin(req, res, async () => {
              console.log("[DEBUG] Admin authorization passed");
              
              try {
                // Acknowledge receipt immediately
                if (!res.headersSent) {
                  console.log("[DEBUG] Sending initial 202 response");
                  res.writeHead(202, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': "https://admin-frontends.vercel.app",
                    'Access-Control-Allow-Headers': "Content-Type, Authorization, x-api-key",
                    'Access-Control-Allow-Credentials': "true"
                  });
                  res.write(JSON.stringify({
                    status: "received",
                    message: "Upload received. Processing images...",
                  }));
                }
                
                console.log("[DEBUG] Calling addMultipleImages");
                // Process the images
                addMultipleImages(req, res)
                  .then(() => {
                    console.log("[DEBUG] Images processed successfully");
                  })
                  .catch(error => {
                    console.error("[DEBUG] Background processing error:", error);
                  });
                
                resolve();
              } catch (error) {
                console.error("[DEBUG] Error in image upload handler:", error);
                reject(error);
              }
            });
            break;
          }
          
          default:
            console.log(`[DEBUG] Method not allowed: ${req.method}`);
            res.status(405).json({ error: "Method not allowed" });
            resolve();
        }
      } catch (error) {
        console.error("[DEBUG] Error handling request:", error);
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