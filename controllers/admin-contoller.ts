//@ts-ignore
import type { NextApiRequest, NextApiResponse } from "next"
import * as adminModel from "@/models/admin"
import { generateCSV } from "../utils/csv-utils"
import type { AuthenticatedRequest } from "@/types"

// Admin dashboard statistics
export const getDashboardStats = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const stats = await adminModel.getDashboardStatistics()
    res.status(200).json(stats)
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
    const authReq = req as unknown as AuthenticatedRequest

    if (!id) {
      return res.status(400).json({ error: "User ID is required" })
    }

    if (typeof is_admin !== "boolean") {
      return res.status(400).json({ error: "is_admin must be a boolean value" })
    }

    // Get the current user to check if they're trying to remove their own admin status
    const requestingUser = authReq.user
    if (Number(id) === requestingUser?.id && !is_admin) {
      return res.status(400).json({ error: "You cannot remove your own admin status" })
    }

    // Update user admin status
    const updatedUser = await adminModel.toggleUserAdmin(Number(id), is_admin)

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" })
    }

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

    const report = await adminModel.getSalesReport(startDate as string | undefined, endDate as string | undefined)

    res.status(200).json(report)
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

    if (!dataType || typeof dataType !== "string") {
      return res.status(400).json({ error: "Invalid data type for export" })
    }

    const { data, headers } = await adminModel.exportData(
      dataType,
      startDate as string | undefined,
      endDate as string | undefined,
    )

    // Convert data to CSV
    const csvContent = generateCSV(data, headers)

    // Set response headers for file download
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename=${dataType}_export.csv`)

    res.status(200).send(csvContent)
  } catch (error) {
    console.error(`Error exporting ${req.query.dataType} data:`, error)
    res.status(500).json({ error: `Failed to export ${req.query.dataType} data` })
  }
}
