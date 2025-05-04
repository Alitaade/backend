import type { NextApiRequest, NextApiResponse } from "next"
import { checkEmailExists, checkEmailForReset } from "../models/auth"

export async function checkEmail(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { email, action } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    // Handle different actions
    if (action === "register") {
      // For registration: check if email is available
      const exists = await checkEmailExists(email)
      if (exists) {
        return res.status(200).json({ available: false, message: "Email already in use" })
      }
      return res.status(200).json({ available: true })
    } else if (action === "reset") {
      // For password reset: check if email exists and has phone/WhatsApp
      const { exists, hasContactInfo } = await checkEmailForReset(email)

      if (!exists) {
        return res.status(200).json({
          exists: false,
          hasContactInfo: false,
          message: "Email not found",
        })
      }

      return res.status(200).json({
        exists: true,
        hasContactInfo,
        message: hasContactInfo ? "Email verified" : "This account doesn't have a phone number for verification",
      })
    } else {
      // Default behavior (backward compatibility)
      const exists = await checkEmailExists(email)
      if (exists) {
        return res.status(200).json({ available: false, message: "Email already in use" })
      }
      return res.status(200).json({ available: true })
    }
  } catch (error) {
    console.error("Error checking email availability:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
