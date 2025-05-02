import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

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

/**
 * CORS middleware - Enhanced to properly handle OPTIONS requests
 */
export const enableCors = (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://admin-frontends.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-API-Key');
  
  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Continue to next middleware for non-OPTIONS requests
  next();
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
    // Skip authentication for OPTIONS requests if they happen to reach here
    if (req.method === 'OPTIONS') {
      return next();
    }
    
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
    // First enable CORS and handle OPTIONS
    enableCors(req, res, () => {
      // Skip authentication for OPTIONS requests
      if (req.method === 'OPTIONS') {
        return;
      }
      
      // Then authenticate the user
      authenticateUser(req, res, () => {
        // Check if user is admin
        if (!req.user?.is_admin) {
          return res.status(403).json({ error: "Admin access required" });
        }

        // Continue to the next middleware or handler
        next();
      });
    });
  } catch (error) {
    console.error("Admin authorization error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Higher-order middleware function for authentication
export function authMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Create a "next" function that calls the handler
    const next = () => handler(req, res);

    // Apply authentication middleware without CORS
    // Get token from Authorization header
    try {
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

        // Continue to the handler
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
}

// Higher-order middleware function for admin authorization
export function requireAdminMiddleware(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return (req: AuthenticatedRequest, res: NextApiResponse) => {
    // Apply CORS first
    enableCors(req, res, () => {
      // Skip authentication for OPTIONS requests and just return 200 OK
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      // Then apply admin authorization
      requireAdmin(req as AuthenticatedRequest, res, () => {
        // Finally call the handler
        handler(req, res);
      });
    });
  };
}