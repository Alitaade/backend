import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { createNewCategory, getCategories } from "../../../controllers/category-controller"
import { requireAdmin, handleCors, setCorsHeaders } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (handleCors(req, res)) return

  try {
    switch (req.method) {
      case "GET":
        // Public endpoint - get all categories
        return await getCategories(req, res)

      case "POST":
        // Admin only - create a new category
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, async () => {
            try {
              await createNewCategory(req, res)
            } catch (error) {
              console.error("Error creating category:", error)
              if (!res.headersSent) {
                res.status(500).json({ error: "Failed to create category" })
              }
            } finally {
              resolve()
            }
          })
        })

      default:
        setCorsHeaders(res)
        res.setHeader("Allow", ["GET", "POST", "OPTIONS"])
        return res.status(405).json({
          error: `Method ${req.method} not allowed`,
          allowedMethods: ["GET", "POST"],
        })
    }
  } catch (error) {
    console.error("Unhandled error in categories handler:", error)
    if (!res.writableEnded) {
      setCorsHeaders(res)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
}

async function getCategoriesHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract query parameters
    const { search, page = 1, limit = 50 } = req.query

    // Build the SQL query
    let sqlQuery = `
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      WHERE 1=1
    `
    const queryParams: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      sqlQuery += ` AND (
        c.name ILIKE $${paramIndex} OR
        c.description ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Group by category
    sqlQuery += ` GROUP BY c.id`

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) as total FROM categories
      ${search ? `WHERE name ILIKE $1 OR description ILIKE $1` : ""}
    `
    const countResult = await query(countQuery, search ? [`%${search}%`] : [])
    const total = Number.parseInt(countResult.rows[0].total)

    // Add pagination
    const offset = (Number(page) - 1) * Number(limit)
    sqlQuery += ` ORDER BY c.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(Number(limit), offset)

    // Execute the query
    const result = await query(sqlQuery, queryParams)

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit))

    // Set CORS headers
    setCorsHeaders(res)

    // Return paginated response
    return res.status(200).json({
      data: result.rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    })
  } catch (error) {
    console.error("Error fetching categories:", error)
    setCorsHeaders(res)
    return res.status(500).json({ error: "Internal server error" })
  }
}
