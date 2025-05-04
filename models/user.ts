import { query } from "../database/connection"
import bcrypt from "bcryptjs"
import type { User, UserInput } from "../types"

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const result = await query("SELECT * FROM users WHERE email = $1", [email])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error finding user by email:", error)
    throw error
  }
}

export const findUserByGoogleId = async (googleId: string): Promise<User | null> => {
  try {
    const result = await query("SELECT * FROM users WHERE google_id = $1", [googleId])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error finding user by Google ID:", error)
    throw error
  }
}

export const findUserById = async (id: number): Promise<User | null> => {
  try {
    const result = await query("SELECT * FROM users WHERE id = $1", [id])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error finding user by ID:", error)
    throw error
  }
}

export const findUserByPhone = async (phone: string): Promise<User | null> => {
  try {
    const queryText = `
      SELECT 
        id,
        email,
        phone,
        first_name,
        last_name,
        is_admin,
        created_at,
        updated_at
      FROM users
      WHERE phone = $1
      LIMIT 1
    `

    const result = await query(queryText, [phone])
    return result.rows[0] || null
  } catch (error) {
    console.error("Error finding user by phone:", error)
    throw error
  }
}

export const createUser = async (userData: UserInput): Promise<User> => {
  try {
    // Hash the password if provided
    let hashedPassword = null
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 10)
    }

    const result = await query(
      `INSERT INTO users (
        email, password, first_name, last_name, phone, whatsapp, gender, 
        address, is_admin, google_id, profile_complete
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        userData.email,
        hashedPassword,
        userData.first_name || null,
        userData.last_name || null,
        userData.phone || null,
        userData.whatsapp || null,
        userData.gender || null,
        userData.address || null,
        userData.is_admin || false,
        userData.google_id || null,
        userData.profile_complete || false,
      ],
    )

    // Create a cart for the new user
    await query("INSERT INTO carts (user_id) VALUES ($1)", [result.rows[0].id])

    return result.rows[0]
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export const updateUser = async (id: number, userData: Partial<UserInput>): Promise<User | null> => {
  try {
    // Start building the query
    let queryText = "UPDATE users SET "
    const queryParams: any[] = []
    let paramCounter = 1

    // Add each field that needs to be updated
    const updates: string[] = []

    // First, check if email is being updated
    if (userData.email !== undefined) {
      // Get the current user to check if email is changing
      const currentUser = await findUserById(id)
      if (!currentUser) {
        throw new Error("User not found")
      }

      // If email is changing and user has a Google ID, clear the Google ID
      if (currentUser.email !== userData.email && currentUser.google_id) {
        console.log(`Email changing from ${currentUser.email} to ${userData.email}, clearing Google ID`)
        userData.google_id = null // Clear the Google ID when email changes
      }
    }

    if (userData.email !== undefined) {
      updates.push(`email = $${paramCounter++}`)
      queryParams.push(userData.email)
    }

    if (userData.password !== undefined) {
      const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null
      updates.push(`password = $${paramCounter++}`)
      queryParams.push(hashedPassword)
    }

    if (userData.first_name !== undefined) {
      updates.push(`first_name = $${paramCounter++}`)
      queryParams.push(userData.first_name)
    }

    if (userData.last_name !== undefined) {
      updates.push(`last_name = $${paramCounter++}`)
      queryParams.push(userData.last_name)
    }

    if (userData.phone !== undefined) {
      updates.push(`phone = $${paramCounter++}`)
      queryParams.push(userData.phone)
    }

    if (userData.whatsapp !== undefined) {
      updates.push(`whatsapp = $${paramCounter++}`)
      queryParams.push(userData.whatsapp)
    }

    if (userData.gender !== undefined) {
      updates.push(`gender = $${paramCounter++}`)
      queryParams.push(userData.gender)
    }

    if (userData.address !== undefined) {
      updates.push(`address = $${paramCounter++}`)
      queryParams.push(userData.address)
    }

    if (userData.google_id !== undefined) {
      updates.push(`google_id = $${paramCounter++}`)
      queryParams.push(userData.google_id)
    }

    if (userData.profile_complete !== undefined) {
      updates.push(`profile_complete = $${paramCounter++}`)
      queryParams.push(userData.profile_complete)
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramCounter++}`)
    queryParams.push(new Date())

    // If there's nothing to update, return the current user
    if (updates.length === 0) {
      return findUserById(id)
    }

    // Complete the query
    queryText += updates.join(", ")
    queryText += ` WHERE id = $${paramCounter} RETURNING *`
    queryParams.push(id)

    // Execute the query
    const result = await query(queryText, queryParams)
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error updating user:", error)
    throw error
  }
}

export const deleteUser = async (id: number): Promise<boolean> => {
  try {
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [id])
    return result.rows.length > 0
  } catch (error) {
    console.error("Error deleting user:", error)
    throw error
  }
}

export const validatePassword = async (user: User, password: string): Promise<boolean> => {
  try {
    if (!user.password) return false
    return await bcrypt.compare(password, user.password)
  } catch (error) {
    console.error("Error validating password:", error)
    throw error
  }
}

export const getAllUsers = async (limit = 100, offset = 0): Promise<User[]> => {
  try {
    const result = await query(
      "SELECT id, email, first_name, last_name, phone, whatsapp, gender, address, is_admin, created_at, updated_at, profile_complete FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    )
    return result.rows
  } catch (error) {
    console.error("Error getting all users:", error)
    throw error
  }
}
