// File: pages/api/index.js
import type { NextApiRequest, NextApiResponse } from "next";
import { checkConnection } from "../../database/connection";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Check database connection
    const isConnected = await checkConnection();

    return res.status(200).json({
      status: "success",
      message: "API is running",
      database: isConnected ? "connected" : "disconnected",
      version: "1.0.0",
    });
  } catch (error) {
    console.error("API health check error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}