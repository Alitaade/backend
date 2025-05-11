import type { NextApiRequest, NextApiResponse } from "next";
import { initiatePasswordReset } from "../../../../controllers/password-reset-controller";
import { allowedOrigins } from "../../../../middleware/origins";

// Helper function to handle CORS
const setCorsHeaders = (res: NextApiResponse, req: NextApiRequest) => {
  const origin = req.headers.origin;
  
  // Check if the origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers for all requests
  setCorsHeaders(res, req);

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Pass the request to the controller
    return await initiatePasswordReset(req, res);
  } catch (error) {
    console.error("Password reset initiation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}