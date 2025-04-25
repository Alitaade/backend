import express from "express"
import { authenticateToken } from "@/middleware/auth-middleware"
import { query } from "@/database/connection"

const router = express.Router()

// Add this endpoint to the existing cart routes
router.delete("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id

    await query("DELETE FROM cart_items WHERE user_id = ?", [userId])

    return res.status(200).json({ message: "Cart cleared successfully" })
  } catch (error) {
    console.error("Error clearing cart:", error)
    return res.status(500).json({ error: "Failed to clear cart" })
  }
})

export default router
