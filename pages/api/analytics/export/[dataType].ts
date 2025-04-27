import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../../database/connection"
import { requireAdmin } from "../../../../middleware/auth-middleware"
import { applyMiddleware } from "../../../../middleware/api-security"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { dataType } = req.query
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
    const values = headers.map((header) => {
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

// Apply admin authentication and CORS middleware
export default applyMiddleware(requireAdmin(handler as any))
