import type { NextApiRequest, NextApiResponse } from "next"
import { createNewProduct, getProducts } from "../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"

// Config for file upload endpoints to disable body parsing
export const config = {
  api: {
    responseLimit: '40mb',
    bodyParser: false,
  },
}

// Main API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all requests
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    // Clone the original query
    const originalQuery = { ...req.query };
    console.log("Original request query:", originalQuery);
    
    // Fix for potential nested param formats like params[all] instead of all
    if (req.query['params[all]'] !== undefined) {
      req.query.all = req.query['params[all]'];
      delete req.query['params[all]'];
    }

    // Normalize the 'all' parameter
    if (req.query.all !== undefined) {
      req.query.all = req.query.all === '' || req.query.all === 'true' ? 'true' : 'false';
    }
    
    // Normalize query param: map ?category= to category_id
    if (req.query.category && !req.query.category_id) {
      req.query.category_id = req.query.category
    }
    
    // Log fixed request parameters
    console.log("Fixed request query:", req.query);

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
      if (req.query.all === 'true') {
        // Set a reasonable maximum limit when fetching all products
        req.query.limit = '9000'; // Adjust this number based on your needs
        req.query.offset = '0';
      }
      
      return await getProducts(req, res)
    }

    // Fallback for unsupported methods
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"])
    return res.status(405).json({ error: "Method not allowed" })
  } catch (error) {
    console.error("Unhandled error in products handler:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}