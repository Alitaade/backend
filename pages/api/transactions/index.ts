import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { requireAdmin } from "../../../middleware/auth-middleware"
import { applyCors } from "../../../middleware/api-security"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Always apply CORS headers first
  applyCors(req, res)
  
  // Handle OPTIONS request properly
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    switch (req.method) {
      case "GET":
        // Admin only - get all transactions
        return new Promise<void>((resolve, reject) => {
          requireAdmin(req, res, async () => {
            try {
              await getTransactionsHandler(req, res)
              resolve()
            } catch (error) {
              console.error("Error in getTransactions:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing transactions request" })
              }
              reject(error)
            }
          })
        })

      default:
        res.setHeader("Allow", ["GET", "OPTIONS"])
        return res.status(405).json({ error: "Method not allowed" })
    }
  } catch (error) {
    console.error("Unhandled error in transactions API handler:", error)
    if (!res.writableEnded) {
      return res.status(500).json({ error: "Internal server error" })
    }
  }
}

async function getTransactionsHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract query parameters
    const { search, status, payment_method, start_date, end_date, page = 1, limit = 10 } = req.query

    // Build the SQL query
    let sqlQuery = `
      SELECT t.*, 
             u.first_name, u.last_name, u.email
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `
    const queryParams: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      sqlQuery += ` AND (
        t.reference ILIKE $${paramIndex} OR
        CAST(t.order_id AS TEXT) ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.first_name ILIKE $${paramIndex} OR
        u.last_name ILIKE $${paramIndex} OR
        CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Add status filter
    if (status) {
      sqlQuery += ` AND t.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    // Add payment method filter
    if (payment_method) {
      sqlQuery += ` AND t.payment_method = $${paramIndex}`
      queryParams.push(payment_method)
      paramIndex++
    }

    // Add date range filters
    if (start_date) {
      sqlQuery += ` AND t.created_at >= $${paramIndex}`
      queryParams.push(new Date(start_date as string))
      paramIndex++
    }

    if (end_date) {
      sqlQuery += ` AND t.created_at <= $${paramIndex}`
      queryParams.push(new Date(end_date as string))
      paramIndex++
    }

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (${sqlQuery}) as filtered_transactions
    `
    const countResult = await query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0].total)

    // Add pagination
    const offset = (Number(page) - 1) * Number(limit)
    sqlQuery += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(Number(limit), offset)

    // Execute the query
    const result = await query(sqlQuery, queryParams)

    // Format the response data
    const formattedTransactions = result.rows.map((transaction) => {
      return {
        ...transaction,
        user: {
          first_name: transaction.first_name,
          last_name: transaction.last_name,
          email: transaction.email,
        },
      }
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit))

    // Return paginated response
    return res.status(200).json({
      data: formattedTransactions,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}