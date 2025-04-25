//@ts-ignore
import express from "express";

const router = express.Router();

// Import controllers from the API pages
import initializePaymentHandler from "../pages/api/payments/initialize";
import verifyPaymentHandler from "../pages/api/payments/verify";
//@ts-ignore
// Initialize payment route
router.post("/initialize", (req, res) => {
  return initializePaymentHandler(req, res);
});
//@ts-ignore
// Verify payment route
router.get("/verify", (req, res) => {
  return verifyPaymentHandler(req, res);
});

export default router;
