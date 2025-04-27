import type { NextApiRequest, NextApiResponse } from "next"

// CORS configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["https://admin-frontends.vercel.app", "https://onlu.vercel.app", "https://pro-project-gilt.vercel.app"]

/**
 * Apply CORS headers to the response
 */
export const applyCors = (req: NextApiRequest, res: NextApiResponse) => {
  // Get the origin from the request
  const origin = req.headers.origin || ALLOWED_ORIGINS

  // Check if the origin is allowed
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  } else if (process.env.NODE_ENV === "development") {
    // In development, allow any origin
    res.setHeader("Access-Control-Allow-Origin", "*")
  } else {
    // Default to the main frontend in production
    res.setHeader("Access-Control-Allow-Origin", "https://onlu.vercel.app")
  }

  // Set other CORS headers
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key, X-CSRF-Token, X-Requested-With",
  )
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Max-Age", "86400") // 24 hours
}

/**
 * Handle CORS preflight requests
 */
export const handleCorsPreflightRequest = (req: NextApiRequest, res: NextApiResponse): boolean => {
  // Apply CORS headers
  applyCors(req, res)

  // Handle OPTIONS requests
  if (req.method === "OPTIONS") {
    res.status(200).end()
    return true
  }

  return false
}

// API key validation
export const validateApiKey = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  // Skip API key validation in development
  if (process.env.NODE_ENV === "development") {
    return next()
  }

  const apiKey = req.headers["x-api-key"]
  const validApiKey = process.env.API_SECRET_KEY

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: "Unauthorized - Invalid API key" })
  }

  next()
}

// Rate limiting middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export const rateLimitMiddleware = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  // Get client IP
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown"

  const key = `${clientIp}-${req.url}`
  const now = Date.now()
  const windowMs = 60 * 1000 // 1 minute window
  const maxRequests = 60 // Max requests per minute

  // Get or initialize request count data
  const requestData = requestCounts.get(key) || {
    count: 0,
    resetTime: now + windowMs,
  }

  // Reset if outside window
  if (now > requestData.resetTime) {
    requestData.count = 0
    requestData.resetTime = now + windowMs
  }

  // Increment request count
  requestData.count++
  requestCounts.set(key, requestData)

  // Check if rate limit exceeded
  if (requestData.count > maxRequests) {
    return res.status(429).json({
      error: "Too many requests, please try again later",
      retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
    })
  }

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", maxRequests.toString())
  res.setHeader("X-RateLimit-Remaining", (maxRequests - requestData.count).toString())
  res.setHeader("X-RateLimit-Reset", Math.ceil(requestData.resetTime / 1000).toString())

  next()
}

// Combined security middleware
export const applyApiSecurity = (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
  // Apply CORS first
  applyCors(req, res)
  if (req.method === "OPTIONS") {
    return
  }

  // Then rate limiting
  rateLimitMiddleware(req, res, () => {
    // Finally API key validation
    validateApiKey(req, res, next)
  })
}

/**
 * Apply security middleware to API routes
 */
export const applyMiddleware = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // Handle CORS preflight request
    if (handleCorsPreflightRequest(req, res)) {
      return
    }

    // Apply CORS headers for all requests
    applyCors(req, res)

    // Add security headers
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("X-Frame-Options", "DENY")
    res.setHeader("X-XSS-Protection", "1; mode=block")
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

    // Call the handler
    return handler(req, res)
  }
}
