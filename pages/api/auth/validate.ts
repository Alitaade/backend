import type { NextApiRequest, NextApiResponse } from "next";
import { validateToken } from "../../../controllers/auth-controller";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request (OPTIONSonly for tt)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Or your specific origin
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Only allow GET method for actual requests
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]); // Tell client what methods are allowed
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Call the validateToken controller
    return await validateToken(req, res);
  } catch (error) {
    console.error("Token validation error:", error);
    // Return valid: false instead of an error to prevent UI disruption
    return res.status(200).json({
      valid: false,
      error: "Invalid token",
      user: null,
    });
  }
}
