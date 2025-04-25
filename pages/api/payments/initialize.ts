import type { NextApiRequest, NextApiResponse } from "next"
import { initializePayment } from "../../../services/paystack-service"
import { getOrderById, updateOrderPaymentStatus } from "../../../models/order"
import { authenticateUser } from "../../../middleware/auth-middleware"
import { getUsdToNgnRate } from "../../../services/exchange-rate-service"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    // Authenticate the user
    return new Promise<void>((resolve) => {
      authenticateUser(req, res, async () => {
        try {
          const user = req.user
          if (!user) {
            res.status(401).json({ error: "Unauthorized" })
            return resolve()
          }

          const { order_id, currency_code, currency_rate } = req.body

          if (!order_id) {
            res.status(400).json({ error: "Order ID is required" })
            return resolve()
          }

          // Get the order details
          const order = await getOrderById(Number(order_id))
          if (!order) {
            res.status(404).json({ error: "Order not found" })
            return resolve()
          }

          // Check if the order belongs to the authenticated user
          if (order.user_id !== user.id) {
            res.status(403).json({ error: "Forbidden" })
            return resolve()
          }

          // Determine the callback URL based on the request origin
          const origin = req.headers.origin || req.headers.referer || "http://localhost:3000"
          const callbackUrl = `${origin}/checkout/callback`

          // Use the currency from the request or fall back to the order's currency
          // Default to NGN if no currency is specified (changed from USD to NGN)
          const orderCurrencyCode = currency_code || order.currency_code || "NGN"

          // Get the exchange rate - either from the request, the order, or fetch it
          let orderCurrencyRate = currency_rate || order.currency_rate || 0

          // If we're using NGN and don't have a rate, fetch it
          if (orderCurrencyCode === "NGN" && orderCurrencyRate <= 0) {
            try {
              orderCurrencyRate = await getUsdToNgnRate()
              console.log(`Fetched NGN exchange rate: ${orderCurrencyRate}`)
            } catch (rateError) {
              console.error("Error fetching exchange rate:", rateError)
              res.status(500).json({
                error: "Failed to fetch exchange rate",
                details: "Could not get the current exchange rate. Please try again later.",
              })
              return resolve()
            }
          }

          console.log(`Initializing payment with currency: ${orderCurrencyCode}, rate: ${orderCurrencyRate}`)

          try {
            // Calculate the amount based on currency
            let paymentAmount = order.total_amount
            
            // If currency is not USD, convert the amount
            if (orderCurrencyCode !== "USD") {
              paymentAmount = order.total_amount * orderCurrencyRate
              console.log(
                `Converting ${order.total_amount} USD to ${paymentAmount} ${orderCurrencyCode} with rate ${orderCurrencyRate}`,
              )
            }

            // Add more customer information to reduce fraud flags
            const paymentResponse = await initializePayment(
              order.order_number,
              paymentAmount,  // Pass the raw decimal amount, not multiplied by 100
              user.email,
              `${user.first_name} ${user.last_name}`,
              user.phone || user.whatsapp || "",
              callbackUrl,
              orderCurrencyCode,
              orderCurrencyRate,
              {
                // Add additional metadata to help with fraud detection
                customer_ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
                customer_user_agent: req.headers["user-agent"],
                customer_country: user.country || "US", // Default to US
                is_returning_customer: true,
                order_items_count: order.items?.length || 1,
                original_currency: "USD",
                original_amount: order.total_amount,
                exchange_rate_used: orderCurrencyRate,
              },
            )

            if (paymentResponse.status) {
              // Update order with payment reference
              await updateOrderPaymentStatus(order.id, "awaiting_payment", paymentResponse.data?.reference)

              // Log successful initialization
              console.log(
                `Payment initialized successfully for order ${order.id} with reference ${paymentResponse.data?.reference} in ${paymentResponse.usedCurrency || orderCurrencyCode}`,
              )

              res.status(200).json({
                message: "Payment initialized successfully",
                paymentReference: paymentResponse.data?.reference,
                paymentUrl: paymentResponse.data?.authorization_url,
                currency: paymentResponse.usedCurrency || orderCurrencyCode,
                originalCurrency: "USD",
                exchangeRate: orderCurrencyRate,
                originalAmount: order.total_amount,
                convertedAmount: paymentAmount,
              })
            } else {
              console.error("Failed to initialize payment:", paymentResponse)
              res.status(400).json({
                error: "Failed to initialize payment",
                details: paymentResponse.message || "Unknown error",
              })
            }
          } catch (paymentError: any) {
            console.error("Payment initialization error:", paymentError)
            
            res.status(400).json({
              error: "Payment initialization failed",
              message: paymentError.message || "An error occurred while processing your payment",
              details: "Your payment could not be processed. Please try again or contact support.",
            })
          }
        } catch (error: any) {
          console.error("Error in payment handler:", error)
          res.status(500).json({
            error: error.message || "Internal server error",
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
          })
        }
        resolve()
      })
    })
  } catch (error: any) {
    console.error("Error in payment initialization handler:", error)
    return res.status(500).json({ error: error.message || "Internal server error" })
  }
}