import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/database/connection";
import { requireAdmin } from "@/middleware/auth-middleware";
import { subDays, subMonths, format, startOfDay, endOfDay, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import {
  SalesByPeriodRow, 
  RecentOrderRow, 
  OrderStatusRow, 
  TopProductRow,
  DashboardStatsResponse,
  SalesByPeriodItem,
  RecentOrderWithUser,
  TopProductItem
} from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for all responses
  res.setHeader("Access-Control-Allow-Origin", "*"); // In production, use specific origins
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Handle OPTIONS request properly
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET", "OPTIONS"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Admin only endpoint
  return new Promise<void>((resolve, reject) => {
    requireAdmin(req, res, async () => {
      try {
        await getDashboardStats(req, res);
        resolve();
      } catch (error) {
        console.error("Error in getDashboardStats:", error);
        if (!res.writableEnded) {
          res.status(500).json({ error: "Server error processing dashboard stats request" });
        }
        reject(error);
      }
    });
  });
}

async function getDashboardStats(req: NextApiRequest, res: NextApiResponse<DashboardStatsResponse | { error: string }>) {
  try {
    const { range = "30days" } = req.query;

    // Determine date range
    let startDate: Date;
    const endDate = new Date();

    switch (range) {
      case "7days":
        startDate = subDays(endDate, 7);
        break;
      case "30days":
        startDate = subDays(endDate, 30);
        break;
      case "90days":
        startDate = subDays(endDate, 90);
        break;
      case "12months":
        startDate = subMonths(endDate, 12);
        break;
      default:
        startDate = subDays(endDate, 30);
    }

    // Format dates for SQL
    const formattedStartDate = format(startOfDay(startDate), "yyyy-MM-dd HH:mm:ss");
    const formattedEndDate = format(endOfDay(endDate), "yyyy-MM-dd HH:mm:ss");

    // Get total revenue
    const totalRevenueQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      AND payment_status = 'paid'
    `;
    const totalRevenueResult = await query(totalRevenueQuery, [formattedStartDate, formattedEndDate]);
    const totalRevenue = Number.parseFloat(totalRevenueResult.rows[0].total_revenue) || 0;

    // Get total orders
    const totalOrdersQuery = `
      SELECT COUNT(*) as total_orders
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
    `;
    const totalOrdersResult = await query(totalOrdersQuery, [formattedStartDate, formattedEndDate]);
    const totalOrders = Number.parseInt(totalOrdersResult.rows[0].total_orders) || 0;

    // Get total users
    const totalUsersQuery = `
      SELECT COUNT(*) as total_users
      FROM users
      WHERE is_admin = false
    `;
    const totalUsersResult = await query(totalUsersQuery);
    const totalUsers = Number.parseInt(totalUsersResult.rows[0].total_users) || 0;

    // Get total products
    const totalProductsQuery = `
      SELECT COUNT(*) as total_products
      FROM products
    `;
    const totalProductsResult = await query(totalProductsQuery);
    const totalProducts = Number.parseInt(totalProductsResult.rows[0].total_products) || 0;

    // Get sales by day/month
    const timeFormat = range === "12months" ? "YYYY-MM" : "YYYY-MM-DD";
    const groupBy = range === "12months" ? "DATE_TRUNC('month', created_at)" : "DATE_TRUNC('day', created_at)";

    const salesByDayQuery = `
      SELECT 
        ${groupBy} as date,
        COALESCE(SUM(total_amount), 0) as sales
      FROM orders
      WHERE created_at BETWEEN $1 AND $2
      AND payment_status = 'paid'
      GROUP BY ${groupBy}
      ORDER BY date ASC
    `;
    const salesByDayResult = await query(salesByDayQuery, [formattedStartDate, formattedEndDate]);

    // Format sales by period - Keep as strings to match frontend expectations
    let salesByDay: SalesByPeriodItem[] = salesByDayResult.rows.map((row: SalesByPeriodRow) => ({
      date: format(new Date(row.date), range === "12months" ? "yyyy-MM" : "yyyy-MM-dd"),
      sales: row.sales,
    }));

    // Generate placeholder data if no sales data is found
    if (salesByDayResult.rows.length === 0) {
      if (range === "12months") {
        // For monthly data
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        salesByDay = months.map(date => ({
          date: format(date, "yyyy-MM"),
          sales: "0",
        }));
      } else {
        // For daily data
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        salesByDay = days.map(date => ({
          date: format(date, "yyyy-MM-dd"),
          sales: "0",
        }));
      }
    }

    // Get recent orders with user details
    const recentOrdersQuery = `
      SELECT o.id, o.user_id, o.order_number, o.total_amount, o.status, o.payment_status, 
             o.payment_method, o.shipping_address, o.created_at, o.updated_at,
             u.first_name, u.last_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `;
    const recentOrdersResult = await query(recentOrdersQuery);

    // Format recent orders to match frontend expectations
    const recentOrders: RecentOrderWithUser[] = recentOrdersResult.rows.map((order: RecentOrderRow) => ({
      id: order.id,
      user_id: order.user_id,
      order_number: order.order_number,
      status: order.status || 'processing',
      payment_status: order.payment_status || 'pending',
      payment_method: order.payment_method || 'card',
      shipping_address: order.shipping_address || '',
      total: Number.parseFloat(order.total_amount) || 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      user: {
        first_name: order.first_name || '',
        last_name: order.last_name || '',
        email: order.email || 'No email provided',
      },
    }));

    // Get top products with price and order details
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
    `;
    const topProductsResult = await query(topProductsQuery, [formattedStartDate, formattedEndDate]);

    // Format top products to match frontend expectations - convert numbers to strings
    let topProducts: TopProductItem[] = topProductsResult.rows.map((row: TopProductRow) => ({
      id: row.id,
      name: row.name || 'Unknown Product',
      price: Number.parseFloat(row.price),
      order_count: row.order_count,
      total_quantity: row.total_quantity,
    }));

    // If no top products found, return an empty array
    if (!topProducts) {
      topProducts = [];
    }

    // Return dashboard stats with consistent data structures matching frontend expectations
    return res.status(200).json({
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue,
      salesByDay,
      recentOrders,
      topProducts,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      // Return empty default data structure on error to prevent client-side errors
      totalUsers: 0,
      totalOrders: 0,
      totalProducts: 0,
      totalRevenue: 0,
      salesByDay: [],
      recentOrders: [],
      topProducts: [],
    } as any);
  }
}