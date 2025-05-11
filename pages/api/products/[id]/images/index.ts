// pages/api/products/[id]/images/index.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { addMultipleImages } from "../../../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware"

export const config = {
  api: {
    responseLimit: "10mb",
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
}
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle preflight request explicitly with all needed headers
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key")
    res.setHeader("Access-Control-Allow-Credentials", "true")
    res.setHeader("Access-Control-Max-Age", "86400") // 24 hours
    return res.status(200).end()
  }

  // For non-OPTIONS requests, use the enableCors middleware
  return new Promise<void>((resolve, reject) => {
    enableCors(req, res, async () => {
      try {
        switch (req.method) {
          case "POST": {
            // Admin only - add multiple images to a product
            requireAdmin(req, res, async () => {
              try {
                // Acknowledge receipt immediately
                if (!res.headersSent) {
                  res.writeHead(202, {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
                    "Access-Control-Allow-Credentials": "true",
                  })
                  res.write(
                    JSON.stringify({
                      status: "received",
                      message: "Upload received. Processing images...",
                    }),
                  )
                }

                // Process the images
                addMultipleImages(req, res)
                  .then(() => {
                    console.log("Images processed successfully")
                  })
                  .catch((error) => {
                    console.error("Background processing error:", error)
                  })

                resolve()
              } catch (error) {
                console.error("Error in image upload handler:", error)
                reject(error)
              }
            })
            break
          }

          default:
            res.status(405).json({ error: "Method not allowed" })
            resolve()
        }
      } catch (error) {
        console.error("Error handling request:", error)
        if (!res.headersSent) {
          res.status(500).json({
            error: "Internal server error",
            message: error.message || "Unknown error",
          })
        }
        resolve()
      }
    })
  })
}
