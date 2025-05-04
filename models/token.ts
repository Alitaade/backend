import { query } from "@/database/connection"
import crypto from "crypto"
import type { Token } from "@/types"

// Generate a secure random token
export const generateToken = (length = 32): string => {
  return crypto.randomBytes(length).toString("hex")
}

// Create a verification token for an order
export const createVerificationToken = async (orderId: number, orderNumber: string): Promise<Token> => {
  try {
    console.log(`Creating verification token for order ID: ${orderId}, order number: ${orderNumber}`)

    // Generate a random token
    const token = generateToken()
    console.log(`Generated token: ${token}`)

    // Set expiration time (24 hours from now)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Store token in database with usage count initialized to 0
    console.log(`Storing token in database with expiration: ${expiresAt}`)
    const result = await query(
      `INSERT INTO payment_verification_tokens 
       (order_id, order_number, token, expires_at, usage_count) 
       VALUES ($1, $2, $3, $4, 0) 
       RETURNING *`,
      [orderId, orderNumber, token, expiresAt],
    )

    console.log(`Token stored successfully with ID: ${result.rows[0].id}`)
    return {
      token: result.rows[0].token,
      expires_at: result.rows[0].expires_at,
    }
  } catch (error) {
    console.error("Error creating verification token:", error)
    throw new Error("Failed to create verification token")
  }
}

// Verify a token for an order with usage limit
export const verifyToken = async (orderNumber: string, token: string): Promise<boolean> => {
  try {
    console.log(`Verifying token for order number: ${orderNumber}, token: ${token}`)

    // Find the token in the database
    const result = await query(
      `SELECT * FROM payment_verification_tokens 
       WHERE order_number = $1 AND token = $2 AND expires_at > NOW() AND used = FALSE AND usage_count < 3`,
      [orderNumber, token],
    )

    if (result.rows.length === 0) {
      console.log(`No valid token found for order number: ${orderNumber}`)
      return false
    }

    console.log(`Valid token found with ID: ${result.rows[0].id}`)

    // Increment usage count
    await query(
      `UPDATE payment_verification_tokens SET usage_count = usage_count + 1, 
       used = CASE WHEN usage_count + 1 >= 3 THEN TRUE ELSE FALSE END 
       WHERE id = $1`,
      [result.rows[0].id],
    )
    console.log(`Token usage count incremented. Current count: ${result.rows[0].usage_count + 1}`)

    return true
  } catch (error) {
    console.error("Error verifying token:", error)
    return false
  }
}

// Get a token for an order regardless of usage status
export const getTokenForOrder = async (orderNumber: string): Promise<string | null> => {
  try {
    console.log(`Getting token for order number: ${orderNumber}`)

    // Modified query to return the most recent token for the order
    // regardless of usage status or count
    const result = await query(
      `SELECT token FROM payment_verification_tokens 
       WHERE order_number = $1
       ORDER BY created_at DESC LIMIT 1`,
      [orderNumber],
    )

    if (result.rows.length === 0) {
      console.log(`No token found for order number: ${orderNumber}`)
      return null
    }

    console.log(`Found token: ${result.rows[0].token}`)
    return result.rows[0].token
  } catch (error) {
    console.error("Error getting token for order:", error)
    return null
  }
}

// Get token usage information
export const getTokenUsageInfo = async (token: string): Promise<{ usageCount: number; maxUses: number } | null> => {
  try {
    const result = await query(
      `SELECT usage_count FROM payment_verification_tokens 
       WHERE token = $1`,
      [token],
    )

    if (result.rows.length === 0) {
      return null
    }

    return {
      usageCount: result.rows[0].usage_count,
      maxUses: 3,
    }
  } catch (error) {
    console.error("Error getting token usage info:", error)
    return null
  }
}
