import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { requireAdminMiddleware } from "../../../middleware/auth-middleware"
import { applyMiddleware } from "../../../middleware/api-security"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests for listing users
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // Extract query parameters
    const { search, is_admin, profile_complete, page = 1, limit = 10 } = req.query

    // Build the SQL query
    let sqlQuery = `
      SELECT id, email, first_name, last_name, is_admin, profile_complete, 
             created_at, updated_at, whatsapp, phone
      FROM users
      WHERE 1=1
    `
    const queryParams: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      sqlQuery += ` AND (
        email ILIKE $${paramIndex} OR
        first_name ILIKE $${paramIndex} OR
        last_name ILIKE $${paramIndex} OR
        CONCAT(first_name, ' ', last_name) ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Add admin filter
    if (is_admin !== undefined) {
      sqlQuery += ` AND is_admin = $${paramIndex}`
      queryParams.push(is_admin === "true")
      paramIndex++
    }

    // Add profile complete filter
    if (profile_complete !== undefined) {
      sqlQuery += ` AND profile_complete = $${paramIndex}`
      queryParams.push(profile_complete === "true")
      paramIndex++
    }

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (${sqlQuery}) as filtered_users
    `
    const countResult = await query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0].total)

    // Add pagination
    const offset = (Number(page) - 1) * Number(limit)
    sqlQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(Number(limit), offset)

    // Execute the query
    const result = await query(sqlQuery, queryParams)

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit))

    // Return paginated response
    return res.status(200).json({
      data: result.rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Apply admin authentication and CORS middleware
// Fix your export line
export default applyMiddleware(requireAdminMiddleware(handler))
