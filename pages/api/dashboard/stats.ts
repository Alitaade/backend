import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { requireAdmin } from "../../../middleware/auth-middleware"
import { applyCors } from "../../../middleware/api-security"
import { subDays, subMonths, format, startOfDay, endOfDay } from "date-fns"

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

    // Get total sales
    const totalSalesQuery = `
      SELECT COALESCE(SUM(total), 0) as total_sales
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      AND payment_status = 'paid'
    `
    const totalSalesResult = await query(totalSalesQuery, [formattedStartDate, formattedEndDate])
    const totalSales = Number.parseFloat(totalSalesResult.rows[0].total_sales)

    // Get total orders
    const totalOrdersQuery = `
      SELECT COUNT(*) as total_orders
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
    `
    const totalOrdersResult = await query(totalOrdersQuery, [formattedStartDate, formattedEndDate])
    const totalOrders = Number.parseInt(totalOrdersResult.rows[0].total_orders)

    // Get new customers
    const newCustomersQuery = `
      SELECT COUNT(*) as new_customers
      FROM users
      WHERE created_at BETWEEN $1 AND $2
      AND is_admin = false
    `
    const newCustomersResult = await query(newCustomersQuery, [formattedStartDate, formattedEndDate])
    const newCustomers = Number.parseInt(newCustomersResult.rows[0].new_customers)

    // Get sales by day/month
    const timeFormat = range === "12months" ? "YYYY-MM" : "YYYY-MM-DD"
    const groupBy = range === "12months" ? "DATE_TRUNC('month', created_at)" : "DATE_TRUNC('day', created_at)"

    const salesByPeriodQuery = `
      SELECT 
        ${groupBy} as date,
        COALESCE(SUM(total), 0) as sales
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      AND payment_status = 'paid'
      GROUP BY ${groupBy}
      ORDER BY date ASC
    `
    const salesByPeriodResult = await query(salesByPeriodQuery, [formattedStartDate, formattedEndDate])

    // Format sales by period
    const salesByPeriod = salesByPeriodResult.rows.map((row) => ({
      date: format(new Date(row.date), range === "12months" ? "MMM yyyy" : "MMM dd"),
      sales: Number.parseFloat(row.sales),
    }))

    // Get recent orders
    const recentOrdersQuery = `
      SELECT o.*, 
             u.first_name, u.last_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `
    const recentOrdersResult = await query(recentOrdersQuery)

    // Format recent orders
    const recentOrders = recentOrdersResult.rows.map((order) => ({
      id: order.id,
      order_number: order.order_number,
      total: Number.parseFloat(order.total),
      status: order.status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      customer: {
        name: `${order.first_name} ${order.last_name}`,
        email: order.email,
      },
    }))

    // Get order status counts
    const orderStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY status
    `
    const orderStatusResult = await query(orderStatusQuery, [formattedStartDate, formattedEndDate])

    // Format order status counts
    const orderStatuses = orderStatusResult.rows.map((row) => ({
      status: row.status,
      count: Number.parseInt(row.count),
    }))

    // Get top products
    const topProductsQuery = `
      SELECT 
        p.id,
        p.name,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as units_sold,
        SUM(oi.price * oi.quantity) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN $1 AND $2
      AND o.payment_status = 'paid'
      GROUP BY p.id, p.name
      ORDER BY units_sold DESC
      LIMIT 5
    `
    const topProductsResult = await query(topProductsQuery, [formattedStartDate, formattedEndDate])

    // Format top products
    const topProducts = topProductsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      order_count: Number.parseInt(row.order_count),
      units_sold: Number.parseInt(row.units_sold),
      revenue: Number.parseFloat(row.revenue),
    }))

  

     // Return dashboard stats
     return res.status(200).json({
      data: {
        totalSales,
        totalOrders,
        newCustomers,
        salesByPeriod,
        recentOrders,
        orderStatuses,
        topProducts,
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}