import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../database/connection"

// Admin dashboard statistics
export const getDashboardStats = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Get user count
    const userCountResult = await query("SELECT COUNT(*) FROM users")
    const userCount = Number.parseInt(userCountResult.rows[0].count)

    // Get product count
    const productCountResult = await query("SELECT COUNT(*) FROM products")
    const productCount = Number.parseInt(productCountResult.rows[0].count)

    // Get order count
    const orderCountResult = await query("SELECT COUNT(*) FROM orders")
    const orderCount = Number.parseInt(orderCountResult.rows[0].count)

    // Get total revenue
    const revenueResult = await query("SELECT SUM(total) FROM orders WHERE payment_status = 'paid'")
    const totalRevenue = Number.parseFloat(revenueResult.rows[0].sum || 0)

    // Get recent orders
    const recentOrdersResult = await query(
      `SELECT o.*, u.first_name, u.last_name, u.email 
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 5`,
    )
    const recentOrders = recentOrdersResult.rows

    // Get sales by date (last 7 days)
    const salesByDateResult = await query(
      `SELECT 
        DATE(created_at) as date, 
        COUNT(*) as order_count, 
        SUM(total) as revenue
       FROM orders
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
    )
    const salesByDate = salesByDateResult.rows

    // Get top selling products
    const topProductsResult = await query(
      `SELECT 
        p.id, p.name, p.base_price,
        COUNT(oi.id) as order_count,
        SUM(oi.quantity) as total_quantity
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       GROUP BY p.id, p.name, p.base_price
       ORDER BY total_quantity DESC
       LIMIT 5`,
    )
    const topProducts = topProductsResult.rows

    res.status(200).json({
      userCount,
      productCount,
      orderCount,
      totalRevenue,
      recentOrders,
      salesByDate,
      topProducts,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    res.status(500).json({ error: "Failed to fetch dashboard statistics" })
  }
}

// Toggle user admin status
export const toggleUserAdminStatus = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { is_admin } = req.body

    if (!id) {
      return res.status(400).json({ error: "User ID is required" })
    }

    if (typeof is_admin !== "boolean") {
      return res.status(400).json({ error: "is_admin must be a boolean value" })
    }

    // Get the current user to check if they're trying to remove their own admin status
    const requestingUser = req.user
    if (Number(id) === requestingUser?.id && !is_admin) {
      return res.status(400).json({ error: "You cannot remove your own admin status" })
    }

    // Update user admin status
    const updateResult = await query("UPDATE users SET is_admin = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [
      is_admin,
      id,
    ])

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const updatedUser = updateResult.rows[0]
    const { password, ...userWithoutPassword } = updatedUser

    res.status(200).json(userWithoutPassword)
  } catch (error) {
    console.error("Error toggling user admin status:", error)
    res.status(500).json({ error: "Failed to update user admin status" })
  }
}

// Get sales report
export const getSalesReport = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { startDate, endDate } = req.query

    let dateFilter = ""
    const queryParams = []

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

    res.status(200).json({
      dailySales,
      salesByPaymentMethod,
      salesByCategory,
      totals,
    })
  } catch (error) {
    console.error("Error generating sales report:", error)
    res.status(500).json({ error: "Failed to generate sales report" })
  }
}

// Export data to CSV
export const exportData = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { dataType } = req.query
    const { startDate, endDate } = req.query

    let dateFilter = ""
    const queryParams = []

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

    let data
    let filename
    let headers

    switch (dataType) {
      case "orders":
        const ordersQuery = `
          SELECT 
            o.id, o.order_number, o.status, o.payment_status, o.total, 
            o.shipping_address, o.created_at,
            u.email as user_email, u.first_name, u.last_name
          FROM orders o
          LEFT JOIN users u ON o.user_id = u.id
          ${dateFilter}
          ORDER BY o.created_at DESC
        `
        const ordersResult = await query(ordersQuery, queryParams)
        data = ordersResult.rows
        filename = "orders_export.csv"
        headers = [
          "ID",
          "Order Number",
          "Status",
          "Payment Status",
          "Total",
          "Shipping Address",
          "Date",
          "Email",
          "First Name",
          "Last Name",
        ]
        break

      case "products":
        const productsQuery = `
          SELECT 
            p.id, p.name, p.description, p.base_price, p.is_active, p.is_featured,
            c.name as category, p.created_at
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          ${dateFilter.replace("created_at", "p.created_at")}
          ORDER BY p.created_at DESC
        `
        const productsResult = await query(productsQuery, queryParams)
        data = productsResult.rows
        filename = "products_export.csv"
        headers = ["ID", "Name", "Description", "Price", "Active", "Featured", "Category", "Created At"]
        break

      case "users":
        const usersQuery = `
          SELECT 
            id, email, first_name, last_name, is_admin, profile_complete, 
            created_at, whatsapp, phone
          FROM users
          ${dateFilter}
          ORDER BY created_at DESC
        `
        const usersResult = await query(usersQuery, queryParams)
        data = usersResult.rows
        filename = "users_export.csv"
        headers = [
          "ID",
          "Email",
          "First Name",
          "Last Name",
          "Admin",
          "Profile Complete",
          "Created At",
          "WhatsApp",
          "Phone",
        ]
        break

      case "transactions":
        const transactionsQuery = `
          SELECT 
            t.id, t.reference, t.order_id, t.amount, t.currency, 
            t.payment_method, t.status, t.created_at,
            u.email as user_email
          FROM transactions t
          LEFT JOIN orders o ON t.order_id = o.id
          LEFT JOIN users u ON o.user_id = u.id
          ${dateFilter.replace("created_at", "t.created_at")}
          ORDER BY t.created_at DESC
        `
        const transactionsResult = await query(transactionsQuery, queryParams)
        data = transactionsResult.rows
        filename = "transactions_export.csv"
        headers = [
          "ID",
          "Reference",
          "Order ID",
          "Amount",
          "Currency",
          "Payment Method",
          "Status",
          "Date",
          "User Email",
        ]
        break

      default:
        return res.status(400).json({ error: "Invalid data type for export" })
    }

    // Convert data to CSV
    const csvContent = generateCSV(data, headers)

    // Set response headers for file download
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`)

    res.status(200).send(csvContent)
  } catch (error) {
    console.error(`Error exporting ${req.query.dataType} data:`, error)
    res.status(500).json({ error: `Failed to export ${req.query.dataType} data` })
  }
}

// Helper function to generate CSV from data
function generateCSV(data, headers) {
  // Add headers row
  let csv = headers.join(",") + "\n"

  // Add data rows
  data.forEach((row) => {
    const values = headers.map((header, index) => {
      // Get the value based on the header (convert to lowercase and replace spaces with underscores)
      const key = header.toLowerCase().replace(/ /g, "_")
      let value = row[key] || ""

      // Handle values with commas, quotes, or newlines
      if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
        value = `"${value.replace(/"/g, '""')}"`
      }

      return value
    })

    csv += values.join(",") + "\n"
  })

  return csv
}
