import type { NextApiRequest, NextApiResponse } from "next"
import { requireAdmin } from "../../../middleware/auth-middleware"
import { query } from "../../../database/connection"

// Handler for dashboard statistics
async function getDashboardStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get time range from query params (default to 30 days)
    const range = (req.query.range as string) || "30days"

    // Calculate date range
    const now = new Date()
    const startDate = new Date()

    switch (range) {
      case "7days":
        startDate.setDate(now.getDate() - 7)
        break
      case "90days":
        startDate.setDate(now.getDate() - 90)
        break
      case "30days":
      default:
        startDate.setDate(now.getDate() - 30)
        break
    }

    const startDateStr = startDate.toISOString().split("T")[0]

    // Get total users count
    const usersResult = await query("SELECT COUNT(*) as count FROM users")
    const totalUsers = Number.parseInt(usersResult.rows[0].count)

    // Get total orders count
    const ordersResult = await query("SELECT COUNT(*) as count FROM orders")
    const totalOrders = Number.parseInt(ordersResult.rows[0].count)

    // Get total products count
    const productsResult = await query("SELECT COUNT(*) as count FROM products")
    const totalProducts = Number.parseInt(productsResult.rows[0].count)

    // Get total revenue
    const revenueResult = await query("SELECT SUM(total) as total FROM orders WHERE payment_status = $1", [
      "paid",
    ])
    const totalRevenue = Number.parseFloat(revenueResult.rows[0].total || 0)

    // Get recent orders
    const recentOrdersQuery = `
      SELECT o.*, u.first_name, u.last_name, u.email 
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `
    const recentOrdersResult = await query(recentOrdersQuery)

    // Get top products
    const topProductsQuery = `
      SELECT p.id, p.name, p.price, COUNT(oi.id) as order_count, SUM(oi.quantity) as total_quantity
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.payment_status = 'paid'
      GROUP BY p.id, p.name, p.price
      ORDER BY total_quantity DESC
      LIMIT 5
    `
    const topProductsResult = await query(topProductsQuery)

    // Get sales by day for the selected period
    const salesByDayQuery = `
      SELECT 
        DATE(o.created_at) as date,
        SUM(o.total) as sales,
        COUNT(o.id) as order_count
      FROM orders o
      WHERE o.payment_status = 'paid'
        AND o.created_at >= $1
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `
    const salesByDayResult = await query(salesByDayQuery, [startDateStr])

    // Return dashboard stats
    res.status(200).json({
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue,
      recentOrders: recentOrdersResult.rows,
      topProducts: topProductsResult.rows,
      salesByDay: salesByDayResult.rows,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    res.status(500).json({ error: "Failed to fetch dashboard statistics" })
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Apply admin authentication middleware
  requireAdmin(req as any, res, () => {
    getDashboardStats(req, res)
  })
}