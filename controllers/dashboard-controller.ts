import type { NextApiRequest, NextApiResponse } from "next"
import {
  getTotalRevenue,
  getTotalOrders,
  getTotalUsers,
  getTotalProducts,
  getSalesByPeriod,
  getRecentOrders,
  getTopProducts,
} from "../models/dashboard"
import { subDays, subMonths, format, startOfDay, endOfDay, eachDayOfInterval, eachMonthOfInterval } from "date-fns"

export async function getDashboardStats(req: NextApiRequest, res: NextApiResponse) {
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
    const isMonthly = range === "12months"

    // Get all stats in parallel for better performance
    const [totalRevenue, totalOrders, totalUsers, totalProducts, salesByDay, recentOrders, topProducts] =
      await Promise.all([
        getTotalRevenue(formattedStartDate, formattedEndDate),
        getTotalOrders(formattedStartDate, formattedEndDate),
        getTotalUsers(),
        getTotalProducts(),
        getSalesByPeriod(formattedStartDate, formattedEndDate, isMonthly),
        getRecentOrders(),
        getTopProducts(formattedStartDate, formattedEndDate),
      ])

    // Generate placeholder data if no sales data is found
    let formattedSalesByDay = salesByDay
    if (salesByDay.length === 0) {
      if (isMonthly) {
        // For monthly data
        const months = eachMonthOfInterval({ start: startDate, end: endDate })
        formattedSalesByDay = months.map((date) => ({
          date: format(date, "yyyy-MM"),
          sales: "0",
        }))
      } else {
        // For daily data
        const days = eachDayOfInterval({ start: startDate, end: endDate })
        formattedSalesByDay = days.map((date) => ({
          date: format(date, "yyyy-MM-dd"),
          sales: "0",
        }))
      }
    }

    // Return dashboard stats with consistent data structures matching frontend expectations
    return res.status(200).json({
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue,
      salesByDay: formattedSalesByDay,
      recentOrders,
      topProducts,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
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
    })
  }
}
