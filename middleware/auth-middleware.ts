import type { NextApiRequest, NextApiResponse } from "next"
import jwt from "jsonwebtoken"

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"
if (!JWT_SECRET) {
  console.warn("Warning: JWT_SECRET environment variable not set, using fallback secret")
}

// Interface for decoded token
interface DecodedToken {
  userId: number
  email: string
  isAdmin: boolean
  iat?: number
  exp?: number
}

// Extended request interface with user property
interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: number
    email: string
    is_admin: boolean
  }
}

/**
 * Middleware to authenticate user from JWT token
 */
export const authenticateUser = (req: AuthenticatedRequest, res: NextApiResponse, next: () => void) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization

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
      //@ts-ignore
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken

      // Add user info to request object
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        is_admin: decoded.isAdmin,
      }

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

/**
 * Helper function to create a handler that applies authentication middleware
 */
export function authMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
  return (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Create a "next" function that calls the handler
    const next = () => handler(req, res)

    // Apply the authentication middleware
    authenticateUser(req, res, next)
  }
}

/**
 * Helper function to create a handler that applies admin authentication middleware
 */
export function adminMiddleware(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
  return (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Create a "next" function that calls the handler
    const next = () => handler(req, res)

    // Apply the admin authentication middleware
    requireAdmin(req, res, next)
  }
}

/**
 * Helper function to set CORS headers consistently
 */
export const setCorsHeaders = (res: NextApiResponse) => {
  // Allow requests from both user and admin frontends
  const allowedOrigins = process.env.ALLOWED_ORIGINS || "https://admin-frontends.vercel.app,https://onlu.vercel.app"

  const origin = Array.isArray(allowedOrigins) ? allowedOrigins.join(",") : allowedOrigins

  res.setHeader("Access-Control-Allow-Origin", origin)
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  res.setHeader("Access-Control-Allow-Credentials", "true")
}

/**
 * Helper function to handle CORS preflight requests
 */
export const handleCors = (req: NextApiRequest, res: NextApiResponse): boolean => {
  setCorsHeaders(res)

  if (req.method === "OPTIONS") {
    res.status(200).end()
    return true
  }

  return false
}
