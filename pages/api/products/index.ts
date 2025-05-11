import type { NextApiRequest, NextApiResponse } from "next"
import { createNewProduct, getProducts } from "../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"
import zlib from "zlib"
import { promisify } from "util"

// Promisify gzip
const gzipAsync = promisify(zlib.gzip)

// Config for file upload endpoints to disable body parsing
export const config = {
  api: {
    responseLimit: "50mb",
    bodyParser: false,
  },
}

// Main API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept-Encoding")
  res.setHeader("Vary", "Accept-Encoding")

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    // Clone the original query
    const originalQuery = { ...req.query }
    console.log("Original request query:", originalQuery)

    // Fix for potential nested param formats like params[all] instead of all
    if (req.query["params[all]"] !== undefined) {
      req.query.all = req.query["params[all]"]
      delete req.query["params[all]"]
    }

    // Normalize the 'all' parameter
    if (req.query.all !== undefined) {
      req.query.all = req.query.all === "" || req.query.all === "true" ? "true" : "false"
    }

    // Normalize query param: map ?category= to category_id
    if (req.query.category && !req.query.category_id) {
      req.query.category_id = req.query.category
    }

    // Check if client supports compression
    const acceptEncoding = req.headers["accept-encoding"] || ""
    const supportsCompression = acceptEncoding.includes("gzip") || acceptEncoding.includes("deflate")

    // Log fixed request parameters
    console.log("Fixed request query:", req.query)

    // Handle POST request: Protected route
    if (req.method === "POST") {
      return new Promise<void>((resolve) => {
        enableCors(req, res, () => {
          requireAdmin(req, res, async () => {
            try {
              await createNewProduct(req, res)
            } catch (error) {
              console.error("Error in createNewProduct:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Internal server error" })
              }
            } finally {
              resolve()
            }
          })
        })
      })
    }

    // Handle GET request: Public
    if (req.method === "GET") {
      // Ensure we don't return too much data even when all=true
      if (req.query.all === "true") {
        // Set a reasonable maximum limit when fetching all products
        req.query.limit = "9000" // Adjust this number based on your needs
        req.query.offset = "0"
      }

      // Get the products
      const productsResponse = await getProducts(req, res, true) // Pass true to prevent auto-sending response

      if (productsResponse) {
        // Apply compression if supported
        if (supportsCompression) {
          try {
            // Compress the response
            const compressedData = await gzipAsync(JSON.stringify(productsResponse))

            // Set appropriate headers
            res.setHeader("Content-Encoding", "gzip")
            res.setHeader("Content-Type", "application/json")

            // Send compressed response
            return res.status(200).send(compressedData)
          } catch (compressionError) {
            console.error("Error compressing response:", compressionError)
            // Fall back to uncompressed response
            return res.status(200).json(productsResponse)
          }
        } else {
          // Send uncompressed response
          return res.status(200).json(productsResponse)
        }
      }

      // If we get here, the response was already sent by getProducts
      return
    }

    // Fallback for unsupported methods
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"])
    return res.status(405).json({ error: "Method not allowed" })
  } catch (error) {
    console.error("Unhandled error in products handler:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
