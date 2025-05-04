import { query } from "@/database/connection"

// Get dashboard statistics
export const getDashboardStatistics = async () => {
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
  const revenueResult = await query("SELECT SUM(total_amount) as sum FROM orders WHERE payment_status = 'paid'")
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
      SUM(total_amount) as revenue
     FROM orders
     WHERE created_at >= NOW() - INTERVAL '7 days'
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
  )
  const salesByDate = salesByDateResult.rows

  // Get top selling products
  const topProductsResult = await query(
    `SELECT 
      p.id, p.name, p.price as base_price,
      COUNT(oi.id) as order_count,
      SUM(oi.quantity) as total_quantity
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     GROUP BY p.id, p.name, p.price
     ORDER BY total_quantity DESC
     LIMIT 5`,
  )
  const topProducts = topProductsResult.rows

  return {
    userCount,
    productCount,
    orderCount,
    totalRevenue,
    recentOrders,
    salesByDate,
    topProducts,
  }
}

// Toggle user admin status
export const toggleUserAdmin = async (userId: number, isAdmin: boolean) => {
  const updateResult = await query("UPDATE users SET is_admin = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [
    isAdmin,
    userId,
  ])

  if (updateResult.rows.length === 0) {
    return null
  }

  return updateResult.rows[0]
}

// Get sales report
export const getSalesReport = async (startDate?: string, endDate?: string) => {
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
      SUM(total_amount) as revenue
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
      SUM(total_amount) as revenue
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
    ${dateFilter.replace("created_at", "o.created_at")}
    GROUP BY c.name
  `
  const categoryResult = await query(categoryQuery, queryParams)
  const salesByCategory = categoryResult.rows

  // Get total statistics
  const totalsQuery = `
    SELECT 
      COUNT(*) as total_orders, 
      SUM(total_amount) as total_revenue,
      AVG(total_amount) as average_order_value
    FROM orders
    ${dateFilter}
  `
  const totalsResult = await query(totalsQuery, queryParams)
  const totals = totalsResult.rows[0]

  return {
    dailySales,
    salesByPaymentMethod,
    salesByCategory,
    totals,
  }
}

// Export data to CSV
export const exportData = async (dataType: string, startDate?: string, endDate?: string) => {
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
  let headers

  switch (dataType) {
    case "orders":
      const ordersQuery = `
        SELECT 
          o.id, o.order_number, o.status, o.payment_status, o.total_amount as total, 
          o.shipping_address, o.created_at,
          u.email as user_email, u.first_name, u.last_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        ${dateFilter}
        ORDER BY o.created_at DESC
      `
      const ordersResult = await query(ordersQuery, queryParams)
      data = ordersResult.rows
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
          p.id, p.name, p.description, p.price as base_price, 
          p.stock_quantity > 0 as is_active, false as is_featured,
          c.name as category, p.created_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${dateFilter.replace("created_at", "p.created_at")}
        ORDER BY p.created_at DESC
      `
      const productsResult = await query(productsQuery, queryParams)
      data = productsResult.rows
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

    default:
      throw new Error("Invalid data type for export")
  }

  return { data, headers }
}
