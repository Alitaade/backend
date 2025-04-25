import type { NextApiRequest, NextApiResponse } from "next";
import { login } from "../../../controllers/auth-controller";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Log request details
  console.log("Login endpoint called with method:", req.method);
  console.log("Headers:", req.headers);
  // Don't log the full body to avoid exposing passwords in logs
  if (req.body) {
    if (typeof req.body === "object") {
      console.log("Body keys:", Object.keys(req.body));
      if (req.body.email) console.log("Email type:", typeof req.body.email);
      if (req.body.password)
        console.log("Password provided:", !!req.body.password);
    } else {
      console.log("Body type:", typeof req.body);
    }
  }

  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    // Use specific origin instead of wildcard
    const requestOrigin = req.headers.origin || "*";
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Set CORS headers for the actual request too
  const requestOrigin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Only allow POST method for actual login
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Call the login controller
  try {
    await login(req, res);
  } catch (error) {
    console.error("Unhandled error in login handler:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
