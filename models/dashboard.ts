import { query } from "../database/connection"
import { format } from "date-fns"
import { SalesByPeriodRow, RecentOrderRow, TopProductRow } from "@/types"


export async function getTotalRevenue(startDate: string, endDate: string): Promise<number> {
  const totalRevenueQuery = `
    SELECT COALESCE(SUM(total_amount), 0) as total_revenue
    FROM orders
    WHERE created_at BETWEEN $1 AND $2
    AND payment_status = 'paid'
  `
  const totalRevenueResult = await query(totalRevenueQuery, [startDate, endDate])
  return Number.parseFloat(totalRevenueResult.rows[0].total_revenue) || 0
}

export async function getTotalOrders(startDate: string, endDate: string): Promise<number> {
  const totalOrdersQuery = `
    SELECT COUNT(*) as total_orders
    FROM orders
    WHERE created_at BETWEEN $1 AND $2
  `
  const totalOrdersResult = await query(totalOrdersQuery, [startDate, endDate])
  return Number.parseInt(totalOrdersResult.rows[0].total_orders) || 0
}

export async function getTotalUsers(): Promise<number> {
  const totalUsersQuery = `
    SELECT COUNT(*) as total_users
    FROM users
    WHERE is_admin = false
  `
  const totalUsersResult = await query(totalUsersQuery)
  return Number.parseInt(totalUsersResult.rows[0].total_users) || 0
}

export async function getTotalProducts(): Promise<number> {
  const totalProductsQuery = `
    SELECT COUNT(*) as total_products
    FROM products
  `
  const totalProductsResult = await query(totalProductsQuery)
  return Number.parseInt(totalProductsResult.rows[0].total_products) || 0
}

export async function getSalesByPeriod(
  startDate: string,
  endDate: string,
  isMonthly: boolean,
): Promise<{ date: string; sales: string }[]> {
  const timeFormat = isMonthly ? "YYYY-MM" : "YYYY-MM-DD"
  const groupBy = isMonthly ? "DATE_TRUNC('month', created_at)" : "DATE_TRUNC('day', created_at)"

  const salesByPeriodQuery = `
    SELECT 
      ${groupBy} as date,
      COALESCE(SUM(total_amount), 0) as sales
    FROM orders
    WHERE created_at BETWEEN $1 AND $2
    AND payment_status = 'paid'
    GROUP BY ${groupBy}
    ORDER BY date ASC
  `

  const salesByPeriodResult = await query(salesByPeriodQuery, [startDate, endDate])

  return salesByPeriodResult.rows.map((row: SalesByPeriodRow) => ({
    date: format(new Date(row.date), isMonthly ? "yyyy-MM" : "yyyy-MM-dd"),
    sales: row.sales,
  }))
}

export async function getRecentOrders(): Promise<any[]> {
  const recentOrdersQuery = `
    SELECT o.id, o.user_id, o.order_number, o.total_amount, o.status, o.payment_status, 
           o.payment_method, o.shipping_address, o.created_at, o.updated_at,
           u.first_name, u.last_name, u.email
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
    LIMIT 5
  `

  const recentOrdersResult = await query(recentOrdersQuery)

  return recentOrdersResult.rows.map((order: RecentOrderRow) => ({
    id: order.id,
    user_id: order.user_id,
    order_number: order.order_number,
    status: order.status || "processing",
    payment_status: order.payment_status || "pending",
    payment_method: order.payment_method || "card",
    shipping_address: order.shipping_address || "",
    total: Number.parseFloat(order.total_amount) || 0,
    created_at: order.created_at,
    updated_at: order.updated_at,
    user: {
      first_name: order.first_name || "",
      last_name: order.last_name || "",
      email: order.email || "No email provided",
    },
  }))
}

export async function getTopProducts(startDate: string, endDate: string): Promise<any[]> {
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

  const topProductsResult = await query(topProductsQuery, [startDate, endDate])

  return (
    topProductsResult.rows.map((row: TopProductRow) => ({
      id: row.id,
      name: row.name || "Unknown Product",
      price: Number.parseFloat(row.price),
      order_count: row.order_count,
      total_quantity: row.total_quantity,
    })) || []
  )
}
