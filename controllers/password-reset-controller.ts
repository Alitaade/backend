import type { NextApiRequest, NextApiResponse } from "next"
import { findUserByEmail, findUserById, updateUser } from "../models/user"
import {
  createPasswordResetCode,
  verifyPasswordResetCode,
  checkRateLimit,
  invalidatePreviousCodes,
  createPasswordResetToken,
  verifyPasswordResetToken,
  markTokenAsUsed,
  getVerificationCodeByUserAndCode,
} from "../models/verification"
import { sendWhatsAppVerificationCode, sendPasswordResetLink } from "../services/ultramsg-service"
import bcrypt from "bcryptjs"

// Update the initiatePasswordReset function to include additional security checks
export const initiatePasswordReset = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { email, method, timestamp } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    // Only allow WhatsApp method as requested
    if (method !== "whatsapp") {
      return res.status(400).json({ error: "Only WhatsApp verification is supported" })
    }

    // Validate timestamp to prevent replay attacks
    if (!timestamp || typeof timestamp !== "number") {
      return res.status(400).json({ error: "Invalid request" })
    }

    // Check if timestamp is within acceptable range (5 minutes)
    const currentTime = new Date().getTime()
    if (currentTime - timestamp > 5 * 60 * 1000) {
      return res.status(400).json({ error: "Request expired" })
    }

    // Find user by email
    const user = await findUserByEmail(email)

    // For security reasons, don't reveal if the email exists or not
    if (!user) {
      // Log the attempt but return a generic success message
      console.log(`Password reset attempt for non-existent email: ${email}`)
      return res.status(200).json({
        success: true,
        message: "If your email is registered, you will receive a verification code shortly.",
      })
    }

    // Check if user has a WhatsApp number first, then fall back to phone number
    let contactNumber = user.whatsapp || user.phone

    if (!contactNumber) {
      // Log the attempt but return a generic success message
      console.log(`Password reset attempt for email without contact info: ${email}`)
      return res.status(200).json({
        success: true,
        message: "If your email is registered, you will receive a verification code shortly.",
      })
    }

    // Check rate limiting
    const withinRateLimit = await checkRateLimit(user.id)
    if (!withinRateLimit) {
      // Log the rate limit hit but return a generic error
      console.log(`Rate limit hit for password reset: ${email}`)
      return res.status(429).json({
        error: "Too many reset attempts. Please try again later.",
      })
    }

    // Invalidate any previous codes
    await invalidatePreviousCodes(user.id)

    // Format the phone number to ensure it has a country code
    if (!contactNumber.startsWith("+")) {
      // Default to Nigeria country code if none is provided
      contactNumber = "+234" + (contactNumber.startsWith("0") ? contactNumber.substring(1) : contactNumber)
    }

    // Handle different reset methods
    if (method === "link") {
      // Generate a password reset token for the link
      const { token } = await createPasswordResetToken(user.id)

      // Create the reset URL
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000"
      const resetUrl = `${baseUrl}/reset-password?token=${token}`

      // Send via WhatsApp
      const result = await sendPasswordResetLink(contactNumber, resetUrl)

      if (!result.success) {
        console.error("Failed to send reset link:", result.error)
        return res.status(500).json({ error: "Failed to send reset link. Please try again later." })
      }

      // In development, return the link for testing
      if (process.env.NODE_ENV !== "production") {
        return res.status(200).json({
          success: true,
          message: "Password reset link has been sent to your WhatsApp.",
          resetUrl: resetUrl, // Only include in development
        })
      }

      return res.status(200).json({
        success: true,
        message: "Password reset link has been sent to your WhatsApp.",
      })
    } else {
      // Generate a verification code
      const { code } = await createPasswordResetCode(user.id)

      // Send the code via WhatsApp
      const sendResult = await sendWhatsAppVerificationCode(contactNumber, code)

      if (!sendResult.success) {
        console.error(`Failed to send verification code via WhatsApp:`, sendResult.error)
        return res.status(500).json({
          error: `Failed to send verification code. Please try again later.`,
        })
      }

      // Mask the phone number for privacy
      const maskedNumber = maskPhoneNumber(contactNumber)

      // Log the successful code generation
      console.log(`Password reset code generated for user ID ${user.id}`)

      return res.status(200).json({
        success: true,
        userId: user.id, // Needed for the verification step
        phoneNumber: maskedNumber, // Return masked phone number for UI display
        message: `Verification code has been sent to your WhatsApp.`,
      })
    }
  } catch (error) {
    console.error("Password reset initiation error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Update the verifyCode function to include additional security checks
export const verifyCode = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { userId, code } = req.body

    if (!userId || !code) {
      return res.status(400).json({ error: "User ID and verification code are required" })
    }

    // Validate userId is a number
    const userIdNum = Number.parseInt(userId)
    if (isNaN(userIdNum)) {
      return res.status(400).json({ error: "Invalid user ID" })
    }

    // Validate code format (should be 6 digits)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: "Invalid verification code format" })
    }

    // Fix vulnerability: Verify the code exists in the database and matches what was sent
    const verificationRecord = await getVerificationCodeByUserAndCode(userIdNum, code)

    if (!verificationRecord) {
      // Log the attempt but return a generic error
      console.log(`Invalid verification code attempt for user ID ${userIdNum}`)
      return res.status(400).json({ error: "Invalid verification code" })
    }

    // Check if code is expired
    if (new Date() > verificationRecord.expires_at) {
      return res.status(400).json({ error: "Verification code has expired" })
    }

    // Check if code is already verified
    if (verificationRecord.verified) {
      return res.status(400).json({ error: "Verification code has already been used" })
    }

    // Check if too many attempts
    if (verificationRecord.attempts >= 5) {
      return res.status(400).json({ error: "Too many failed attempts. Please request a new code." })
    }

    // Verify the code
    const isValid = await verifyPasswordResetCode(userIdNum, code)

    if (!isValid) {
      // Log the failed attempt
      console.log(`Failed verification code attempt for user ID ${userIdNum}`)
      return res.status(400).json({ error: "Invalid or expired verification code" })
    }

    // Generate a temporary token for the reset step
    const { token } = await createPasswordResetToken(userIdNum)

    // Log the successful verification
    console.log(`Successful verification for user ID ${userIdNum}`)

    return res.status(200).json({
      success: true,
      resetToken: token,
      message: "Verification successful. You can now reset your password.",
    })
  } catch (error) {
    console.error("Code verification error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Update the resetPassword function to include additional security checks
export const resetPassword = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" })
    }

    // Validate token format
    if (!/^[a-zA-Z0-9_-]{20,}$/.test(token)) {
      return res.status(400).json({ error: "Invalid token format" })
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters long" })
    }

    // Additional password validation
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one lowercase letter" })
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one uppercase letter" })
    }

    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one number" })
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return res.status(400).json({ error: "Password must contain at least one special character" })
    }

    // Verify the token and get the user ID
    const userId = await verifyPasswordResetToken(token)

    if (!userId) {
      // Log the attempt but return a generic error
      console.log(`Invalid reset token attempt`)
      return res.status(400).json({ error: "Invalid or expired token" })
    }

    // Get the user
    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update the user's password
    await updateUser(userId, { password: hashedPassword })

    // Mark the token as used
    await markTokenAsUsed(token)

    // Log the successful password reset
    console.log(`Password reset successful for user ID ${userId}`)

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    })
  } catch (error) {
    console.error("Password reset error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Verify a reset token (used when accessing the reset page via link)
export const verifyResetToken = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { token } = req.query

    if (!token) {
      return res.status(400).json({ error: "Token is required" })
    }

    // Verify the token and get the user ID
    const userId = await verifyPasswordResetToken(token as string)

    if (!userId) {
      return res.status(400).json({ error: "Invalid or expired token" })
    }

    // Get the user
    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    return res.status(200).json({
      success: true,
      email: user.email,
      message: "Token is valid",
    })
  } catch (error) {
    console.error("Token verification error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Helper function to mask phone number for privacy
function maskPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return ""

  // Keep the country code and first two digits, mask the middle, show last two
  const parts = phoneNumber.split("")

  // Find the position after country code (look for + and digits)
  let countryCodeEndPos = 0
  for (let i = 0; i < parts.length; i++) {
    if (i === 0 && parts[i] === "+") continue
    if (!/\d/.test(parts[i])) break
    countryCodeEndPos = i
  }

  // Keep country code + first two digits visible
  const visiblePrefix = countryCodeEndPos + 3

  // Keep last two digits visible
  const visibleSuffix = Math.max(parts.length - 2, visiblePrefix)

  // Create the masked number
  return parts
    .map((char, index) => {
      if (index <= visiblePrefix || index >= visibleSuffix) {
        return char
      }
      return "*"
    })
    .join("")
}
