import type { NextApiRequest, NextApiResponse } from "next"; import jwt from "jsonwebtoken"; import { OAuth2Client } from "google-auth-library"; import { findUserByEmail, findUserByGoogleId, createUser, validatePassword, findUserById, } from "../models/user"; import { query } fro

pasted

See this code
import type { NextApiRequest, NextApiResponse } from "next"
import { googleAuth } from "../../../controllers/auth-controller"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  // Only allow POST method for Google authentication
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Call the googleAuth controller
  try {
    await googleAuth(req, res)
  } catch (error) {
    console.error("Unhandled error in Google auth handler:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}
 See the error
Access to XMLHttpRequest at 'https://onlu.vercel.app/api/auth/google' from origin 'https://pro-project-gilt.vercel.app' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.

Edit
I can see the issue. Your code is configured to handle CORS preflight requests correctly, but you're still getting a CORS error when trying to access the Google authentication endpoint from a different origin.

The problem is that you're setting CORS headers only for the OPTIONS request, but not for the actual POST request. When the actual POST request is made, those headers are missing, which is why the browser is blocking the request.

Here's how you can fix this:


Fixed Google Auth API Handler
Code 
Key changes I made:

Moved the CORS headers outside the OPTIONS condition, so they're applied to all requests (including POST)
Changed the Access-Control-Allow-Origin from * (wildcard) to the specific origin that needs access (https://pro-project-gilt.vercel.app)
This is a common CORS issue - you need to ensure that the actual response includes the CORS headers, not just the preflight OPTIONS response.

If you have multiple frontends that need to access this API, you could:

Use an environment variable to configure allowed origins
Create a list of allowed origins and check if the requesting origin is in that list
Go back to using * if you want to allow access from any origin (though this is less secure)
Would you like me to show you any of these alternative implementations?





import type { NextApiRequest, NextApiResponse } from "next" import { query } from "../../../database/connection" import { requireAdmin, handleCors, setCorsHeaders } from "../../../middleware/auth-middleware" import { subDays, subMonths, format, startOfDay, endOfDay } from "date-fns" export def

pasted


import type { NextApiRequest, NextApiResponse } from "next" import jwt from "jsonwebtoken" import { applyCors } from "./api-security" // JWT configuration const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key" if (!JWT_SECRET) { console.warn("Warning: JWT_SECRET environment var

pasted


import type { NextApiRequest, NextApiResponse } from "next" // CORS configuration const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["https://admin-frontends.vercel.app", "https://onlu.vercel.app", "https://pro-project-gilt.vercel.app"] /**

pasted

Next see this
Access to XMLHttpRequest at 'https://onlu.vercel.app/api/dashboard/stats?range=30days' from origin 'https://admin-frontends.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: It does not have HTTP ok status.
See the code
See the auth middleware
See the api security

Edit
Based on the additional code samples and error messages, I can now see the CORS issue more clearly. The problem with your dashboard stats endpoint is that the preflight request isn't being handled correctly.

Let's look at all the relevant pieces:

From api-security.ts, you have good CORS configuration with a list of allowed origins
In the dashboard stats API, you're using handleCors but there might be an issue with how it's being handled in the admin authentication flow
The error message indicates the preflight request is failing with a non-OK status code
Here's a solution to fix the CORS issue with your dashboard stats endpoint:


Fixed Dashboard Stats API Handler
Code 
The main issues I fixed:

Direct CORS handling: Rather than relying on nested middleware functions to handle CORS, I apply the CORS headers directly at the start of the request lifecycle.
OPTIONS response: I made sure to return a proper 200 status code for OPTIONS requests before any authentication logic runs.
Simplified flow: Removed the handleCors and setCorsHeaders references that might be conflicting with proper CORS handling.
For your authentication flow with respect to CORS, I also recommend reviewing the authentication middleware to ensure it properly handles OPTIONS requests before running any authentication logic. Here's a suggested fix for your auth middleware:


Fixed Authentication Middleware
Code 
The main improvements here are:

Always applying CORS headers at the start of each middleware function
Adding dedicated handling for OPTIONS requests before any authentication logic runs
Making sure the preflight request always gets a 200 OK response
This ensures that browsers can properly complete the preflight request before sending the actual authentication request with credentials.







import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { requireAdmin } from "../../../middleware/auth-middleware"
import { applyCors } from "../../../middleware/api-security"
import { subDays, subMonths, format, startOfDay, endOfDay } from "date-fns"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Always apply CORS headers first
  applyCors(req, res)
  
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