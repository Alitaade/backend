import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { requireAdmin } from "../../../middleware/auth-middleware"
import { applyMiddleware } from "../../../middleware/api-security"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // Extract date range from query parameters
    const { startDate, endDate } = req.query

    let dateFilter = ""
    const queryParams: any[] = []

    if (startDate && endDate) {
      dateFilter = "WHERE created_at BETWEEN $1 AND $2"
      queryParams.push(startDate, endDate)
    } else if (startDate) {
      dateFilter = "WHERE created_at >= $1"
      queryParams.push(startDate)
    } else if (endDate) {
      dateFilter = "WHERE created_at <= $1"
      queryParams.push(endDate)
    }

    // Get daily sales
    const dailySalesQuery = `
      SELECT 
        DATE(created_at) as date, 
        COUNT(*) as order_count, 
        SUM(total) as revenue
      FROM orders
      ${dateFilter}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `
    const dailySalesResult = await query(dailySalesQuery, queryParams)
    const dailySales = dailySalesResult.rows

    // Get sales by payment method
    const paymentMethodQuery = `
      SELECT 
        payment_method, 
        COUNT(*) as order_count, 
        SUM(total) as revenue
      FROM orders
      ${dateFilter}
      GROUP BY payment_method
    `
    const paymentMethodResult = await query(paymentMethodQuery, queryParams)
    const salesByPaymentMethod = paymentMethodResult.rows

    // Get sales by category
    const categoryQuery = `
      SELECT 
        c.name as category, 
        COUNT(DISTINCT o.id) as order_count, 
        SUM(oi.quantity) as total_quantity,
        SUM(oi.price * oi.quantity) as revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      ${dateFilter}
      GROUP BY c.name
    `
    const categoryResult = await query(categoryQuery, queryParams)
    const salesByCategory = categoryResult.rows

    // Get total statistics
    const totalsQuery = `
      SELECT 
        COUNT(*) as total_orders, 
        SUM(total) as total_revenue,
        AVG(total) as average_order_value
      FROM orders
      ${dateFilter}
    `
    const totalsResult = await query(totalsQuery, queryParams)
    const totals = totalsResult.rows[0]

    // Return the sales report data
    return res.status(200).json({
      dailySales,
      salesByPaymentMethod,
      salesByCategory,
      totals,
    })
  } catch (error) {
    console.error("Error generating sales report:", error)
    return res.status(500).json({ error: "Failed to generate sales report" })
  }
}

// Apply admin authentication and CORS middleware
export default applyMiddleware(requireAdmin(handler as any))
