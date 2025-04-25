import type { NextApiRequest, NextApiResponse } from "next";
import { resetPassword } from "../../../../controllers/password-reset-controller";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request
  const origin = req.headers.origin || "https://pro-project-gilt.vercel.app";
  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://pro-project-gilt.vercel.app"
    );
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    return res.status(200).end();
  }

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Process the password reset request
  return resetPassword(req, res);
}
