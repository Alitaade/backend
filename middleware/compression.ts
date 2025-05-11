import type { NextApiRequest, NextApiResponse } from "next"
import compression from "compression"
import { promisify } from "util"

// Create a promisified version of the compression middleware
const compressMiddleware = promisify(
  compression({
    level: 6, // Compression level (0-9, where 9 is maximum compression)
    threshold: 1024, // Only compress responses larger than 1KB
    filter: (req, res) => {
      // Don't compress responses with this header
      if (req.headers["x-no-compression"]) {
        return false
      }
      // Use compression filter defaults
      return compression.filter(req, res)
    },
  }),
)

// Middleware to apply compression to API responses
export const applyCompression = async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  try {
    // Apply compression
    await compressMiddleware(req, res)
    // Continue with the request
    next()
  } catch (error) {
    console.error("Error applying compression:", error)
    // Continue anyway if compression fails
    next()
  }
}
