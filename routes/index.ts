import express from "express";
import cartRoutes from "./cart";
import orderRoutes from "./order";
import paymentRoutes from "./payments";
import settingsRoutes from "./settings";
const router = express.Router();
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/settings", settingsRoutes);

export default router;
