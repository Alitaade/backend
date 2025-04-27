import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { requireAdmin } from "../../../middleware/auth-middleware"
import { subDays, subMonths, format, startOfDay, endOfDay, eachDayOfInterval, eachMonthOfInterval } from "date-fns"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle OPTIONS request properly
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // Admin only endpoint
  return new Promise<void>((resolve, reject) => {
    requireAdmin(req, res, async () => {
      try {
        await getDashboardStats(req, res)
        resolve()
      } catch (error) {
        console.error("Error in getDashboardStats:", error)
        if (!res.writableEnded) {
          res.status(500).json({ error: "Server error processing dashboard stats request" })
        }
        reject(error)
      }
    })
  })
}

async function getDashboardStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { range = "30days" } = req.query

    // Determine date range
    let startDate: Date
    const endDate = new Date()

    switch (range) {
      case "7days":
        startDate = subDays(endDate, 7)
        break
      case "30days":
        startDate = subDays(endDate, 30)
        break
      case "90days":
        startDate = subDays(endDate, 90)
        break
      case "12months":
        startDate = subMonths(endDate, 12)
        break
      default:
        startDate = subDays(endDate, 30)
    }

    // Format dates for SQL
    const formattedStartDate = format(startOfDay(startDate), "yyyy-MM-dd HH:mm:ss")
    const formattedEndDate = format(endOfDay(endDate), "yyyy-MM-dd HH:mm:ss")

    // Get total sales (renamed to match frontend interface)
    const totalSalesQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_sales
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      AND payment_status = 'paid'
    `
    const totalSalesResult = await query(totalSalesQuery, [formattedStartDate, formattedEndDate])
    const totalRevenue = Number.parseFloat(totalSalesResult.rows[0].total_sales)

    // Get total orders
    const totalOrdersQuery = `
      SELECT COUNT(*) as total_orders
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
    `
    const totalOrdersResult = await query(totalOrdersQuery, [formattedStartDate, formattedEndDate])
    const totalOrders = Number.parseInt(totalOrdersResult.rows[0].total_orders)

    // Get new customers (renamed to totalUsers to match frontend)
    const newCustomersQuery = `
      SELECT COUNT(*) as total_users
      FROM users
      WHERE created_at BETWEEN $1 AND $2
      AND is_admin = false
    `
    const newCustomersResult = await query(newCustomersQuery, [formattedStartDate, formattedEndDate])
    const totalUsers = Number.parseInt(newCustomersResult.rows[0].total_users)

    // Get total products count - FIXED to match schema (removed is_active filter)
    const totalProductsQuery = `
      SELECT COUNT(*) as total_products
      FROM products
    `
    const totalProductsResult = await query(totalProductsQuery)
    const totalProducts = Number.parseInt(totalProductsResult.rows[0].total_products)

    // Get sales by day/month (renamed to salesByDay to match frontend)
    const timeFormat = range === "12months" ? "YYYY-MM" : "YYYY-MM-DD"
    const groupBy = range === "12months" ? "DATE_TRUNC('month', created_at)" : "DATE_TRUNC('day', created_at)"

    const salesByDayQuery = `
      SELECT 
        ${groupBy} as date,
        COALESCE(SUM(total_amount), 0) as sales
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      AND payment_status = 'paid'
      GROUP BY ${groupBy}
      ORDER BY date ASC
    `
    const salesByDayResult = await query(salesByDayQuery, [formattedStartDate, formattedEndDate])

    // Format sales by period (renamed to salesByDay to match frontend)
    let salesByDay = salesByDayResult.rows.map((row) => ({
      date: format(new Date(row.date), range === "12months" ? "yyyy-MM" : "yyyy-MM-dd"),
      sales: row.sales.toString(),
    }))

    // Generate placeholder data if no sales data is found
    if (salesByDayResult.rows.length === 0) {
      if (range === "12months") {
        // For monthly data
        const months = eachMonthOfInterval({ start: startDate, end: endDate })
        salesByDay = months.map(date => ({
          date: format(date, "yyyy-MM"),
          sales: "0"
        }))
      } else {
        // For daily data
        const days = eachDayOfInterval({ start: startDate, end: endDate })
        salesByDay = days.map(date => ({
          date: format(date, "yyyy-MM-dd"),
          sales: "0"
        }))
      }
    }

    // Get recent orders - FIXED to match schema fields
    const recentOrdersQuery = `
      SELECT o.id, o.order_number, o.user_id, o.total_amount, o.status, 
             o.payment_method, o.payment_status, o.shipping_address,
             o.created_at, o.updated_at,
             u.first_name, u.last_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `
    const recentOrdersResult = await query(recentOrdersQuery)

    // Format recent orders to match schema fields
    const recentOrders = recentOrdersResult.rows.map((order) => ({
      id: order.id,
      user_id: order.user_id,
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      shipping_address: order.shipping_address,
      total: Number.parseFloat(order.total_amount || '0'),
      created_at: order.created_at,
      updated_at: order.updated_at,
      user: {
        first_name: order.first_name || '',
        last_name: order.last_name || '',
        email: order.email || '',
      }
    }))

    // Get top products - FIXED to match schema (changed base_price to price)
    const topProductsQuery = `
      SELECT 
        p.id,
        p.name,
        p.price,
        COUNT(DISTINCT o.id) as order_count,
        SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN $1 AND $2
      AND o.payment_status = 'paid'
      GROUP BY p.id, p.name, p.price
      ORDER BY total_quantity DESC
      LIMIT 5
    `
    const topProductsResult = await query(topProductsQuery, [formattedStartDate, formattedEndDate])

    // Format top products to match frontend expectations
    const topProducts = topProductsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: Number.parseFloat(row.price),
      order_count: row.order_count.toString(),
      total_quantity: row.total_quantity.toString(),
    }))

    // Return dashboard stats with structure matching the frontend interface
    return res.status(200).json({
      data: {
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue,
        salesByDay,
        recentOrders,
        topProducts,
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}