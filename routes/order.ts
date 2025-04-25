//@ts-ignore
import express from "express";
import { authenticateUser } from "../middleware/auth-middleware";
import {
  createOrder,
  getOrder,
  getOrderByNumber,
  getUserOrderHistory,
  updateStatus,
  updatePaymentStatus,
} from "../controllers/order-controller";
//@ts-ignore
import { getUserOrders } from "../controllers/user-controller";

const router = express.Router();

// Create a new order
router.post("/", authenticateUser, createOrder);

// Get order by ID
router.get("/:id", authenticateUser, getOrder);

// Get order by order number
router.get("/number/:orderNumber", authenticateUser, getOrderByNumber);

// Get user order history
router.get("/user/:id", authenticateUser, getUserOrderHistory);

// Update order status
router.put("/:id/status", authenticateUser, updateStatus);

// Update order payment status
router.put("/:id/payment", authenticateUser, updatePaymentStatus);

// Get user order history
//@ts-ignore
router.get("/user", authenticateUser, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Unauthorized - User ID not found" });
    }

    console.log(`Fetching orders for user ID: ${userId}`);
    const orders = await getUserOrders(userId);

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Error getting user orders:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
