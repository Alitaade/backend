// pages/api/auth/google-config.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get the origin from the request headers
  const origin = req.headers.origin;

  // Allow specific origins
  const allowedOrigins = [
    "https://pro-project-gilt.vercel.app",
    "http://localhost:3000",
  ];

  // Set the CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    // For other origins, set specific allow-origin without credentials
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Make sure we don't include credentials for these requests
  }

  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Return the Google Client ID
  return res.status(200).json({
    clientId: process.env.GOOGLE_CLIENT_ID || "",
  });
}
