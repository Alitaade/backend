import type { NextApiRequest, NextApiResponse } from "next"
import { createNewProduct, getProducts } from "../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"
import compression from "compression"

// Config with compression
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '6mb', // Stay within platform limits
  },
}

// Enable compression middleware
const compressionMiddleware = compression({
  level: 9, // Maximum compression level
  threshold: 0, // Compress all responses
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply compression to all responses
  await new Promise<void>((resolve, reject) => {
    compressionMiddleware(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve()
    })
  })
  
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    // Normalize query parameters
    console.log("Original request query:", req.query)
    
    // Fix for potential nested param formats
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('params[') && key.endsWith(']')) {
        const actualKey = key.substring(7, key.length - 1)
        req.query[actualKey] = req.query[key]
        delete req.query[key]
      }
    })
    
    // Map category to category_id for backward compatibility
    if (req.query.category && !req.query.category_id) {
      req.query.category_id = req.query.category
    }
    
    // Keep the 'all' parameter's behavior - but optimize what we return
    if (req.query.all !== undefined) {
      req.query.all = req.query.all === '' || req.query.all === 'true' ? 'true' : 'false'
    }
    
    console.log("Normalized request query:", req.query)

    // Handle POST request (unchanged)
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

    // Handle GET request with optimized data
    if (req.method === "GET") {
      // When 'all' is true, we'll need to be smart about what we send
      if (req.query.all === 'true') {
        // First, check for fields parameter that can reduce data
        const fields = req.query.fields || 'minimal';
        req.query.fields = fields;
        
        // Set a large but reasonable limit for a single request
        // With compression, we can return more data in the same size
        req.query.limit = '2000'; // With compression, this should work for most cases
        req.query.offset = '0';
      }
      
      return await getProducts(req, res)
    }

    // Method not allowed
    res.setHeader("Allow", ["GET", "POST", "OPTIONS"])
    return res.status(405).json({ error: "Method not allowed" })
  } catch (error) {
    console.error("Unhandled error in products handler:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}