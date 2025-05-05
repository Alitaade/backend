import type { NextApiRequest, NextApiResponse } from "next";
import { login } from "../../../controllers/auth-controller";
import rateLimit from "../../../middleware/rate-limit";

// API configuration
export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
    externalResolver: true,
  },
};

/**
 * Handles CORS preflight requests
 */
function handleCorsPreflightRequest(req: NextApiRequest, res: NextApiResponse): void {
  const requestOrigin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.status(200).end();
}

/**
 * Sets CORS headers for normal requests
 */
function setCorsHeaders(req: NextApiRequest, res: NextApiResponse): void {
  const requestOrigin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

/**
 * Logs request details without exposing sensitive information
 */
function logRequestDetails(req: NextApiRequest): void {
  console.log("Login endpoint called with method:", req.method);
  console.log("Headers:", req.headers);
  
  // Don't log the full body to avoid exposing passwords in logs
  if (req.body) {
    if (typeof req.body === "object") {
      console.log("Body keys:", Object.keys(req.body));
      if (req.body.email) console.log("Email type:", typeof req.body.email);
      if (req.body.password) console.log("Password provided:", !!req.body.password);
    } else {
      console.log("Body type:", typeof req.body);
    }
  }
}

/**
 * Applies rate limiting to the login endpoint
 */
async function applyRateLimiting(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500, // Max number of unique tokens per interval
    limit: 20, // 20 requests per minute
  });

  try {
    // Get the IP address to use as the token
    const token = (req.headers["x-forwarded-for"] as string) || 
                  req.socket.remoteAddress || 
                  "unknown";
                  
    // Check the rate limit
    await limiter.check(res, 20, token);
    return true;
  } catch (error) {
    // Response is already set by the rate limiter
    return false;
  }
}

/**
 * Processes the login request with a timeout
 */
async function processLoginWithTimeout(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  try {
    // Set a timeout for the login process
    const loginPromise = login(req, res);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Login request timed out"));
      }, 15000); // 15 seconds timeout
    });

    // Race the login against the timeout
    await Promise.race([loginPromise, timeoutPromise]);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
}

/**
 * Main API handler for login endpoint
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  // Log request details
  logRequestDetails(req);

  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req, res);
  }

  // Set CORS headers for the actual request
  setCorsHeaders(req, res);

  // Apply rate limiting
  const rateLimitPassed = await applyRateLimiting(req, res);
  if (!rateLimitPassed) return;

  // Only allow POST method for actual login
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Process login request
  await processLoginWithTimeout(req, res);
}