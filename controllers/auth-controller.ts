import type { NextApiRequest, NextApiResponse } from "next"
import jwt, { SignOptions } from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import {
  findUserByEmail,
  findUserByGoogleId,
  createUser,
  validatePassword,
  findUserById,
  updateUser,
} from "../models/user"

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h"
// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "")

export const login = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    console.log("Login request body:", req.body)

    // Extract email and password from request body
    let email, password

    if (typeof req.body === "string") {
      // If body is a string, try to parse it as JSON
      try {
        const parsedBody = JSON.parse(req.body)
        email = parsedBody.email
        password = parsedBody.password
      } catch (e) {
        console.error("Failed to parse request body:", e)
        return res.status(400).json({ error: "Invalid request format" })
      }
    } else {
      // If body is already an object
      email = req.body.email
      password = req.body.password
    }

    // Convert to strings and trim
    if (email) email = String(email).trim()
    if (password) {
      password = String(password).trim()
    }

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Find user by email
    const user = await findUserByEmail(email)
    if (!user) {
      console.log("Login attempt failed - User not found:", email)
      return res.status(401).json({ error: "Invalid credentials" })
    }

    console.log("Found user:", {
      id: user.id,
      email: user.email,
      hasPassword: !!user.password,
      passwordHash: user.password
    })

    // Validate password
    const isPasswordValid = await validatePassword(user, password)
    console.log("Password validation result:", isPasswordValid)

    if (!isPasswordValid) {
      console.log("Invalid password for user:", email)
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.is_admin },
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    )

    // Return user data (excluding password) and token
    const { password: _, ...userWithoutPassword } = user

    console.log("Login successful for user:", email)
    res.status(200).json({
      message: "Login successful",
      user: userWithoutPassword,
      token,
      profileComplete: user.profile_complete,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export const register = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { email, password, first_name, last_name } = req.body

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" })
    }

    // Create new user
    const newUser = await createUser({
      email,
      password,
      first_name,
      last_name,
      profile_complete: false,
    })

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, isAdmin: newUser.is_admin },
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    )

    // Return user data (excluding password) and token
    const { password: _, ...userWithoutPassword } = newUser

    res.status(201).json({
      message: "Registration successful",
      user: userWithoutPassword,
      token,
      isNewUser: true, // Add isNewUser property
      profileComplete: false,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

// Update the googleAuth function to handle email changes properly
export const googleAuth = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ error: "Google token is required" })
    }

    // Verify Google token
    const ticket = await googleClient
      .verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
      .catch((error) => {
        throw new Error("Invalid Google token. Please try again.")
      })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return res.status(400).json({ error: "Invalid Google token or missing email" })
    }

    const { email, sub: googleId, given_name, family_name } = payload

    // Check if user exists by Google ID
    let user = await findUserByGoogleId(googleId)

    // If not found by Google ID, check by email
    if (!user) {
      user = await findUserByEmail(email)
    }

    let isNewUser = false

    if (user) {
      // If user exists but email doesn't match the Google account email,
      // this means the user has changed their email in the profile settings
      if (user.email !== email) {
        console.log(`Google login: Email mismatch. User email: ${user.email}, Google email: ${email}`)

        // Check if another account already exists with this Google email
        const existingUserWithEmail = await findUserByEmail(email)

        if (existingUserWithEmail && existingUserWithEmail.id !== user.id) {
          // Another account already exists with this email
          return res.status(400).json({
            error: "Another account already exists with this email. Please log in with your updated email address.",
          })
        }

        // Update the user's email to match the Google account email
        user = await updateUser(user.id, {
          email: email,
          google_id: googleId, // Ensure Google ID is set
        })

        if (!user) {
          throw new Error("Failed to update user email")
        }
      }
      // Update existing user with Google ID if not set
      else if (!user.google_id) {
        user = await updateUser(user.id, { google_id: googleId })
      }
    } else {
      // Create new user
      user = await createUser({
        email,
        google_id: googleId,
        first_name: given_name || null,
        last_name: family_name || null,
        password: null, // No password for Google users
        profile_complete: false,
      })
      isNewUser = true
    }

    // Add null check here to satisfy TypeScript
    if (!user) {
      throw new Error("Failed to create or retrieve user")
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email, isAdmin: user.is_admin },
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    )

    // Return user data and token
    const { password: _, ...userWithoutPassword } = user

    res.status(200).json({
      message: isNewUser ? "Registration successful" : "Login successful",
      user: userWithoutPassword,
      token: jwtToken,
      isNewUser,
      profileComplete: user.profile_complete || false, // Ensure this is explicitly set
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal server error" })
  }
}

export const completeProfile = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { whatsapp, first_name, last_name, gender } = req.body

    if (!id) {
      return res.status(400).json({ error: "User ID is required" })
    }

    if (!whatsapp || !first_name || !last_name || !gender) {
      return res.status(400).json({ error: "All fields are required" })
    }

    // Update user profile
    const updatedUser = await updateUser(Number(id), {
      whatsapp,
      first_name,
      last_name,
      gender,
      profile_complete: true,
    })

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" })
    }

    // Return updated user data
    const { password: _, ...userWithoutPassword } = updatedUser

    res.status(200).json({
      message: "Profile completed successfully",
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error("Profile completion error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export const validateToken = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      console.log("No authorization header found")
      return res.status(200).json({ valid: false, error: "Authorization header missing" })
    }

    const [bearer, token] = authHeader.split(" ")
    if (bearer !== "Bearer" || !token) {
      console.log("Invalid authorization format")
      return res.status(200).json({ valid: false, error: "Invalid authorization format" })
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: number
        email: string
        isAdmin: boolean
      }

      // Check if user exists
      const user = await findUserById(decoded.userId)
      if (!user) {
        console.log("User not found for token")
        return res.status(200).json({ valid: false, error: "User not found" })
      }

      // Return user data with the validation response
      return res.status(200).json({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          is_admin: user.is_admin,
          first_name: user.first_name,
          last_name: user.last_name,
          profile_complete: user.profile_complete,
          whatsapp: user.whatsapp,
          phone: user.phone,
        },
      })
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError)
      return res.status(200).json({ valid: false, error: "Invalid or expired token" })
    }
  } catch (error) {
    console.error("Token validation error:", error)
    return res.status(200).json({ valid: false, error: "Internal server error" })
  }
}

export const checkEmailAvailability = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return res.status(400).json({ available: false, error: "Email already in use" })
    }

    return res.status(200).json({ available: true })
  } catch (error) {
    console.error("Error checking email availability:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
