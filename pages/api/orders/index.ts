import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { createOrder } from "../../../controllers/order-controller"
import { authenticateUser, requireAdmin, enableCors } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case "GET":
        // Admin only - get all orders
        return new Promise<void>((resolve, reject) => {
          requireAdmin(req, res, async () => {
            try {
              await getOrdersHandler(req, res)
              resolve()
            } catch (error) {
              console.error("Error in getOrders:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Server error processing orders request" })
              }
              reject(error)
            }
          })
        })

        case "POST":
          // Authenticated user - create a new order
          return await new Promise<void>((resolve, reject) => {
            authenticateUser(req, res, async () => {
              try {
                await createOrder(req, res);
                resolve();
              } catch (error) {
                console.error("Error in createOrder:", error);
                if (!res.writableEnded) {
                  res
                    .status(500)
                    .json({ error: "Server error processing order creation" });
                }
                reject(error);
              }
            });
          });
  
        default:
          return res.status(405).json({ error: "Method not allowed" });
      }
    } catch (error) {
      console.error("Unhandled error in orders API handler:", error);
      if (!res.writableEnded) {
        return res.status(500).json({ error: "Internal server error" });
      }
    }
  }

async function getOrdersHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract query parameters
    const { search, status, payment_status, start_date, end_date, page = 1, limit = 10 } = req.query

    // Build the SQL query
    let sqlQuery = `
      SELECT o.*, 
             u.first_name, u.last_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `
    const queryParams: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      sqlQuery += ` AND (
        o.order_number ILIKE $${paramIndex} OR
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
      sqlQuery += ` AND o.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    // Add payment status filter
    if (payment_status) {
      sqlQuery += ` AND o.payment_status = $${paramIndex}`
      queryParams.push(payment_status)
      paramIndex++
    }

    // Add date range filters
    if (start_date) {
      sqlQuery += ` AND o.created_at >= $${paramIndex}`
      queryParams.push(new Date(start_date as string))
      paramIndex++
    }

    if (end_date) {
      sqlQuery += ` AND o.created_at <= $${paramIndex}`
      queryParams.push(new Date(end_date as string))
      paramIndex++
    }

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (${sqlQuery}) as filtered_orders
    `
    const countResult = await query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0].total)

    // Add pagination
    const offset = (Number(page) - 1) * Number(limit)
    sqlQuery += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(Number(limit), offset)

    // Execute the query
    const result = await query(sqlQuery, queryParams)

    // Format the response data
    const formattedOrders = result.rows.map((order) => {
      return {
        ...order,
        user: {
          first_name: order.first_name,
          last_name: order.last_name,
          email: order.email,
        },
      }
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit))

    // Return paginated response
    return res.status(200).json({
      data: formattedOrders,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    })
  } catch (error) {
    console.error("Error fetching orders:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}