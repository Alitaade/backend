import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

// List of allowed origins for CORS
const allowedOrigins = [
  "https://onlu.vercel.app",
  "https://www.onlu.vercel.app",
  "https://pro-project-gilt.vercel.app",
  "https://www.pro-project-gilt.vercel.app",
  "https://admin-frontends.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001"
];

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
if (!JWT_SECRET) {
  console.warn(
    "Warning: JWT_SECRET environment variable not set, using fallback secret"
  );
}

// Interface for decoded token
interface DecodedToken {
  userId: number;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// Extended request interface with user property
interface AuthenticatedRequest extends NextApiRequest {
  user?: {
    id: number;
    email: string;
    is_admin: boolean;
  };
}

// CORS helper functions
const setCorsHeaders = (res: NextApiResponse, origin: string) => {
  // Always set a valid origin, default to the first allowed origin if none provided
  const validOrigin = origin || allowedOrigins[0];
  
  res.setHeader("Access-Control-Allow-Origin", validOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key, x-api-key, authorization, X-CSRF-Token, X-Requested-With"
  );
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours
};

const handleCors = (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin || "";
  const isAllowedOrigin = allowedOrigins.includes(origin) || process.env.NODE_ENV === "development";

  // Always set CORS headers, but use the appropriate origin
  if (isAllowedOrigin && origin) {
    setCorsHeaders(res, origin);
  } else {
    // Use the first allowed origin as default
    setCorsHeaders(res, allowedOrigins[0]);
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return true;
  }

  return false;
};

export const applyCors = (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Handle CORS
      const isPreflight = handleCors(req, res);
      if (isPreflight) return;

      // Continue to the handler
      return handler(req, res);
    } catch (error) {
      console.error("CORS middleware error:", error);
      // Ensure we still set CORS headers even if there's an error
      setCorsHeaders(res, allowedOrigins[0]);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to authenticate user from JWT token
 */
export const authenticateUser = (
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    console.log("Auth header:", authHeader);

    if (!authHeader) {
      console.log("No Authorization header found");
      return res.status(401).json({ error: "Authorization header missing" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.log("Invalid Authorization header format");
      return res.status(401).json({ error: "Invalid authorization format" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("Token is empty");
      return res.status(401).json({ error: "Invalid token format" });
    }

    try {
      // Verify token
      //@ts-ignore
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      console.log("Token decoded successfully:", decoded);

      // Add user info to request object
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        is_admin: decoded.isAdmin,
      };

      console.log("User attached to request:", req.user);

      // Continue to the next middleware or handler
      next();
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Middleware to check if authenticated user is an admin
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: NextApiResponse,
  next: () => void
) => {
  try {
    // First authenticate the user
    authenticateUser(req, res, () => {
      // Check if user is admin
      if (!req.user?.is_admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Continue to the next middleware or handler
      next();
    });
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Add this to your auth-middleware.ts file
export function authMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Create a "next" function that calls the handler
    const next = () => handler(req, res);

    // Apply the authentication middleware
    authenticateUser(req, res, next);
  };
}
