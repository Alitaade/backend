// pages/api/auth/check-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { findUserByEmail } from "../../../models/user";
import { applyMiddleware } from "../../../middleware/api-security";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, action } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user by email
    const existingUser = await findUserByEmail(email);

    // Handle different actions
    if (action === "register") {
      // For registration: check if email is available
      if (existingUser) {
        return res
          .status(200)
          .json({ available: false, message: "Email already in use" });
      }
      return res.status(200).json({ available: true });
    } else if (action === "reset") {
      // For password reset: check if email exists and has phone/WhatsApp
      if (!existingUser) {
        return res.status(200).json({
          exists: false,
          hasContactInfo: false,
          message: "Email not found",
        });
      }

      // Check if user has a WhatsApp number or phone number
      const hasContactInfo = !!(existingUser.whatsapp || existingUser.phone);

      return res.status(200).json({
        exists: true,
        hasContactInfo,
        message: hasContactInfo
          ? "Email verified"
          : "This account doesn't have a phone number for verification",
      });
    } else {
      // Default behavior (backward compatibility)
      if (existingUser) {
        return res
          .status(200)
          .json({ available: false, message: "Email already in use" });
      }
      return res.status(200).json({ available: true });
    }
  } catch (error) {
    console.error("Error checking email availability:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default applyMiddleware(handler);
