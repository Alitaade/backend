import type { NextApiRequest, NextApiResponse } from "next";

// List of allowed origins for CORS
const allowedOrigins = [
  "https://onlu.vercel.app",
  "https://www.onlu.vercel.app",
  "https://pro-project-gilt.vercel.app",
  "https://www.pro-project-gilt.vercel.app",
  "https://admin-frontends.vercel.app",
  // Add your production domains here
];

// Add localhost for development
if (process.env.NODE_ENV === "development") {
  allowedOrigins.push("http://localhost:3000");
  allowedOrigins.push("http://localhost:3001");
}

// API key validation
export const validateApiKey = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  // Skip API key validation in development
  if (process.env.NODE_ENV === "development") {
    return next();
  }

  const apiKey = req.headers["x-api-key"];
  const validApiKey = process.env.API_SECRET_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: "Unauthorized - Invalid API key" });
  }

  next();
};

// CORS middleware
export const corsMiddleware = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  // Get the origin from the request headers
  const origin = req.headers.origin || "";

  // Check if the origin is in our list of allowed origins
  const isAllowedOrigin =
    allowedOrigins.includes(origin as string) ||
    process.env.NODE_ENV === "development";

  // Set CORS headers based on origin validation
  if (isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // For security, we set a default allowed origin if the request origin is not allowed
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
  }

  // Set other CORS headers
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  // Update the Access-Control-Allow-Headers list
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key, x-api-key, authorization"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight requests - IMPORTANT: Return immediately for OPTIONS
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
};

// Rate limiting middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimitMiddleware = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  // Get client IP
  const clientIp =
    req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

  const key = `${clientIp}-${req.url}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 60; // Max requests per minute

  // Get or initialize request count data
  const requestData = requestCounts.get(key) || {
    count: 0,
    resetTime: now + windowMs,
  };

  // Reset if outside window
  if (now > requestData.resetTime) {
    requestData.count = 0;
    requestData.resetTime = now + windowMs;
  }

  // Increment request count
  requestData.count++;
  requestCounts.set(key, requestData);

  // Check if rate limit exceeded
  if (requestData.count > maxRequests) {
    return res.status(429).json({
      error: "Too many requests, please try again later",
      retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
    });
  }

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", maxRequests.toString());
  res.setHeader(
    "X-RateLimit-Remaining",
    (maxRequests - requestData.count).toString()
  );
  res.setHeader(
    "X-RateLimit-Reset",
    Math.ceil(requestData.resetTime / 1000).toString()
  );

  next();
};

// Combined security middleware
export const applyApiSecurity = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  // Apply CORS first
  corsMiddleware(req, res, () => {
    // Skip other middleware for OPTIONS requests
    if (req.method === "OPTIONS") {
      return;
    }

    // Then rate limiting
    rateLimitMiddleware(req, res, () => {
      // Finally API key validation
      validateApiKey(req, res, next);
    });
  });
};

// Helper function to apply middleware to API routes
type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void> | void;

export function applyMiddleware(handler: ApiHandler): ApiHandler {
  return (req: NextApiRequest, res: NextApiResponse) => {
    // Create a "next" function that calls the handler
    const next = () => handler(req, res);

    // Apply the security middleware
    applyApiSecurity(req, res, next);
  };
}
