import type { NextApiRequest, NextApiResponse } from "next";
import { resetPassword } from "../../../../controllers/password-reset-controller";
import { allowedOrigins } from "../../../../middleware/origins";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const origin = req.headers.origin;
  
  // Check if the origin is in our allowed list
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // Fallback to the first allowed origin or a default
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0] || "");
  }
  
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Process the password reset request
  return resetPassword(req, res);
}