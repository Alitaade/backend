import { query } from "../database/connection"
import crypto from "crypto"
import type { VerificationCode, Token } from "../types"

// Generate a random verification code
export const generateVerificationCode = (length = 6): string => {
  // Generate a numeric code
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, "0")
}

// Create a verification code for password reset
export const createPasswordResetCode = async (
  userId: number,
  expiresInMinutes = 15,
): Promise<{ code: string; expiresAt: Date }> => {
  try {
    // Generate a random code
    const code = generateVerificationCode()

    // Set expiration time
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes)

    // Store code in database
    await query(
      `INSERT INTO verification_codes 
       (user_id, code, type, expires_at, attempts, verified) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, code, "password_reset", expiresAt, 0, false],
    )

    return { code, expiresAt }
  } catch (error) {
    console.error("Error creating password reset code:", error)
    throw new Error("Failed to create verification code")
  }
}

// Get verification code by user ID and code
export const getVerificationCodeByUserAndCode = async (
  userId: number,
  code: string,
): Promise<VerificationCode | null> => {
  try {
    const result = await query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND type = 'password_reset'`,
      [userId, code],
    )

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error getting verification code:", error)
    return null
  }
}

// Verify a password reset code
export const verifyPasswordResetCode = async (userId: number, code: string): Promise<boolean> => {
  try {
    // Get the verification code from the database
    const result = await query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND code = $2 AND type = 'password_reset' 
       AND expires_at > NOW() AND verified = false`,
      [userId, code],
    )

    if (result.rows.length === 0) {
      // Increment attempts for invalid codes if we can find the record
      await query(
        `UPDATE verification_codes 
         SET attempts = attempts + 1 
         WHERE user_id = $1 AND type = 'password_reset' AND verified = false`,
        [userId],
      )
      return false
    }

    const verificationCode = result.rows[0]

    // Check if too many attempts
    if (verificationCode.attempts >= 5) {
      return false
    }

    // Mark the code as verified
    await query(
      `UPDATE verification_codes 
       SET verified = true, attempts = attempts + 1 
       WHERE id = $1`,
      [verificationCode.id],
    )

    return true
  } catch (error) {
    console.error("Error verifying password reset code:", error)
    return false
  }
}

// Get the most recent verification code for a user
export const getLatestVerificationCode = async (
  userId: number,
  type = "password_reset",
): Promise<VerificationCode | null> => {
  try {
    const result = await query(
      `SELECT * FROM verification_codes 
       WHERE user_id = $1 AND type = $2 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, type],
    )

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error getting latest verification code:", error)
    return null
  }
}

// Check if a user has requested too many codes recently (rate limiting)
export const checkRateLimit = async (userId: number): Promise<boolean> => {
  try {
    // Check if user has requested more than 3 codes in the last hour
    const result = await query(
      `SELECT COUNT(*) as count FROM verification_codes 
       WHERE user_id = $1 AND type = 'password_reset' 
       AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId],
    )

    const count = Number.parseInt(result.rows[0].count)
    return count < 6 // Allow up to 3 requests per hour
  } catch (error) {
    console.error("Error checking rate limit:", error)
    return false
  }
}

// Invalidate all previous verification codes for a user
export const invalidatePreviousCodes = async (userId: number, type = "password_reset"): Promise<void> => {
  try {
    await query(
      `UPDATE verification_codes 
       SET verified = true 
       WHERE user_id = $1 AND type = $2 AND verified = false`,
      [userId, type],
    )
  } catch (error) {
    console.error("Error invalidating previous codes:", error)
    throw new Error("Failed to invalidate previous codes")
  }
}

// Create a verification token for password reset link
export const createPasswordResetToken = async (userId: number, expiresInMinutes = 15): Promise<Token> => {
  try {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex")

    // Set expiration time
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes)

    // Store token in database
    await query(
      `INSERT INTO password_reset_tokens 
       (user_id, token, expires_at, used) 
       VALUES ($1, $2, $3, false)`,
      [userId, token, expiresAt],
    )

    return { token, expires_at: expiresAt }
  } catch (error) {
    console.error("Error creating password reset token:", error)
    throw new Error("Failed to create reset token")
  }
}

// Verify a password reset token
export const verifyPasswordResetToken = async (token: string): Promise<number | null> => {
  try {
    const result = await query(
      `SELECT user_id FROM password_reset_tokens 
       WHERE token = $1 AND expires_at > NOW() AND used = false`,
      [token],
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0].user_id
  } catch (error) {
    console.error("Error verifying password reset token:", error)
    return null
  }
}

// Mark a password reset token as used
export const markTokenAsUsed = async (token: string): Promise<boolean> => {
  try {
    const result = await query(
      `UPDATE password_reset_tokens 
       SET used = true 
       WHERE token = $1 
       RETURNING id`,
      [token],
    )

    return result.rows.length > 0
  } catch (error) {
    console.error("Error marking token as used:", error)
    return false
  }
}
