import type { NextApiRequest, NextApiResponse } from "next"
import jwt from "jsonwebtoken"
import type { DecodedToken, AuthenticatedRequest } from "@/types"

const allowedOrigin = process.env.ADMIN_ORIGIN || "*"
// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"
if (!JWT_SECRET) {
  console.warn("Warning: JWT_SECRET environment variable not set, using fallback secret")
}

/**
 * Middleware to authenticate user from JWT token
 */
export const authenticateUser = (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
  try {
    // Get token from Authorization header
    const authHeader = (req.headers as { authorization?: string }).authorization
    console.log("Auth header:", authHeader)

    if (!authHeader) {
      console.log("No Authorization header found")
      return res.status(401).json({ error: "Authorization header missing" })
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("Invalid Authorization header format")
      return res.status(401).json({ error: "Invalid authorization format" })
    }

    const token = authHeader.split(" ")[1]
    if (!token) {
      console.log("Token is empty")
      return res.status(401).json({ error: "Invalid token format" })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken
      console.log("Token decoded successfully:", decoded)

      // Add user info to request object
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        is_admin: decoded.isAdmin,
      }

      console.log("User attached to request:", req.user)

      // Continue to the next middleware or handler
      next()
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError)
      return res.status(401).json({ error: "Invalid or expired token" })
    }
  } catch (error) {
    console.error("Authentication middleware error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
/**
 * CORS middleware
 */

export const enableCors = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin)
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-API-Key")

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  next()
}

/**
 * Middleware to check if authenticated user is an admin
 */
export const requireAdmin = (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
  try {
    // First authenticate the user
    authenticateUser(req, res, () => {
      // Check if user is admin
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Admin access required" })
      }

      // Continue to the next middleware or handler
      next()
    })
  } catch (error) {
    console.error("Admin authorization error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
// Add this to your auth-middleware.ts file
export function authMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
  return (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Create a "next" function that calls the handler
    const next = () => handler(req as unknown as NextApiRequest, res)

    // Apply the authentication middleware
    authenticateUser(req, res, next)
  }
}
// Add this to your auth-middleware.ts file
export function requireAdminMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
  return (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Create a "next" function that calls the handler
    const next = () => handler(req as unknown as NextApiRequest, res)

    // Apply the admin authorization middleware
    requireAdmin(req, res, next)
  }
}
