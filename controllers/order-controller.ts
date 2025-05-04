import type { NextApiRequest, NextApiResponse } from "next"
import * as orderModel from "@/models/order"
import { initializePayment, verifyPayment } from "../services/paystack-service"
import { createVerificationToken } from "../models/token"
import type { ExtendedNextApiRequest } from "@/types"

// Create order
export const createOrder = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { user_id, shipping_address, shipping_method, payment_method, currency_code, currency_rate } = req.body

    if (!user_id || !shipping_address || !shipping_method || !payment_method) {
      return res.status(400).json({ error: "All order details are required" })
    }

    let paymentReference = null
    if (payment_method === "automatic_transfer") {
      paymentReference = `PS-${Date.now()}` // Generate a unique reference for Paystack
    }

    const order = await orderModel.createOrderFromCart(
      {
        user_id: Number.parseInt(user_id as string),
        shipping_address,
        shipping_method,
        payment_method,
        currency_code,
        currency_rate,
      },
      paymentReference ?? undefined,
    )

    if (!order) {
      return res.status(400).json({ error: "Failed to create order" })
    }

    return res.status(201).json({ message: "Order created successfully", order })
  } catch (error) {
    console.error("Error creating order:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const getOrderItems = async (req: NextApiRequest, res: NextApiResponse, orderId: string) => {
  try {
    // First, check if the order exists
    const orderExists = await orderModel.checkOrderExists(orderId)

    if (!orderExists) {
      return res.status(404).json({ error: "Order not found" })
    }

    // Get order items with product information
    const items = await orderModel.getOrderItems(orderId)

    return res.status(200).json({ items })
  } catch (error) {
    console.error("Error fetching order items:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Get order
export const getOrder = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" })
    }

    const order = await orderModel.getOrderById(Number.parseInt(id as string))

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    return res.status(200).json({ order })
  } catch (error) {
    console.error("Error getting order:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Get order by number
export const getOrderByNumber = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { orderNumber } = req.query

    if (!orderNumber) {
      return res.status(400).json({ error: "Order number is required" })
    }

    const order = await orderModel.getOrderByOrderNumber(orderNumber as string)

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    return res.status(200).json({ order })
  } catch (error) {
    console.error("Error getting order by number:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Get user order history
export const getUserOrderHistory = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "User ID is required" })
    }

    const orders = await orderModel.getUserOrders(Number.parseInt(id as string))

    return res.status(200).json({ orders })
  } catch (error) {
    console.error("Error getting user orders:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Update status
export const updateStatus = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { status } = req.body

    if (!id || !status) {
      return res.status(400).json({ error: "Order ID and status are required" })
    }

    const order = await orderModel.updateOrderStatus(Number.parseInt(id as string), status)

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    return res.status(200).json({ message: "Order status updated", order })
  } catch (error) {
    console.error("Error updating order status:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Update payment status
export const updatePaymentStatus = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  try {
    const { id } = req.query
    const { paymentStatus, paymentReference } = req.body

    if (!id || !paymentStatus) {
      res.status(400).json({ error: "Order ID and payment status are required" })
      return
    }

    const order = await orderModel.updateOrderPaymentStatus(
      Number.parseInt(id as string),
      paymentStatus,
      paymentReference as string,
    )

    if (!order) {
      res.status(404).json({ error: "Order not found" })
      return
    }

    res.status(200).json({ message: "Order payment status updated", order })
  } catch (error) {
    console.error("Error updating order payment status:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

export const updateOrderPaymentStatusAdmin = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { paymentStatus, paymentReference } = req.body

    if (!id) {
      return res.status(400).json({ error: "Order ID is required" })
    }

    if (!paymentStatus) {
      return res.status(400).json({ error: "Payment status is required" })
    }

    // Validate that id is a valid number
    const orderId = Number(id)
    if (isNaN(orderId)) {
      console.log(`Invalid order ID: ${id} is not a number`)
      return res.status(400).json({ error: "Invalid order ID format" })
    }

    // Check if authentication middleware set the user
    if (!req.user || !req.user.id) {
      console.log("User not authenticated or user ID missing")
      return res.status(401).json({ error: "Unauthorized - User not authenticated" })
    }

    console.log(`Updating payment status for order ${orderId} by user ${req.user.id}`)

    // Get the order to check ownership
    const order = await orderModel.getOrderById(orderId)
    if (!order) {
      console.log(`Order ${orderId} not found`)
      return res.status(404).json({ error: "Order not found" })
    }

    // Check if the order belongs to the authenticated user or if the user is an admin
    if (String(order.user_id) !== String(req.user.id) && !req.user.is_admin) {
      console.log(`User ${req.user.id} is not authorized to update order ${orderId} belonging to user ${order.user_id}`)
      return res.status(403).json({ error: "Forbidden - You do not have permission to update this order" })
    }

    // Update order payment status
    const updatedOrder = await orderModel.updateOrderPaymentStatusAdmin(
      orderId,
      paymentStatus,
      paymentReference
    )

    // If payment is completed, also update order status to processing if it's pending
    if (paymentStatus === "completed" && order.status === "pending") {
      await orderModel.updateOrderStatus(orderId, "processing")
      console.log(`Updated order status to 'processing' for order ${orderId}`)
    }

    console.log(`Successfully updated payment status to '${paymentStatus}' for order ${orderId}`)
    return res.status(200).json({
      message: "Order payment status updated successfully",
      order: updatedOrder,
    })
  } catch (error) {
    console.error("Error updating order payment status:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const updatePaymentStatuss = async (req: NextApiRequest, res: NextApiResponse, orderId: string) => {
  try {
    const { paymentStatus } = req.body

    // Validate payment status
    const validPaymentStatuses = orderModel.getValidPaymentStatuses()
    if (!paymentStatus || !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({ 
        error: `Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}` 
      })
    }

    // Update order payment status
    const updatedOrder = await orderModel.updatePaymentStatus(orderId, paymentStatus)

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" })
    }

    return res.status(200).json({
      message: "Payment status updated successfully",
      order: updatedOrder
    })
  } catch (error) {
    console.error("Error updating payment status:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Initialize Paystack payment
export const initializePaystackPayment = async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
  try {
    const { order_id } = req.body
    const userId = req.user?.id

    if (!order_id || !userId) {
      return res.status(400).json({ error: "Order ID and user ID are required" })
    }

    const order = await orderModel.getOrderById(Number(order_id))

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    const user = req.user

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Determine the callback URL based on the request origin
    // Fix the type error by ensuring we always pass a string to the function
    const origin = (req.headers.origin || req.headers.referer || "http://localhost:3000") as string
    const callbackUrl = `${origin}/checkout/callback`

    // Initialize payment with Paystack
    const paymentResponse = await initializePayment(
      order.order_number,
      order.total_amount,
      user.email,
      `${user.first_name} ${user.last_name}`,
      user.phone || user.whatsapp || "",
      callbackUrl,
    )

    if (paymentResponse.status) {
      // Update order with payment reference
      await orderModel.updateOrderPaymentStatus(order.id, "awaiting_payment", paymentResponse.data?.reference)

      return res.status(200).json({
        message: "Payment initialized successfully",
        paymentReference: paymentResponse.data?.reference,
        paymentUrl: paymentResponse.data?.authorization_url,
      })
    } else {
      return res.status(400).json({ error: "Failed to initialize payment" })
    }
  } catch (error: any) {
    console.error("Error initializing payment:", error)
    return res.status(500).json({ error: error.message || "Internal server error" })
  }
}

// Verify Paystack payment
export const verifyPaystackPayment = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { reference } = req.query

    if (!reference) {
      console.log("Error: Payment reference is required")
      return res.status(400).json({ error: "Payment reference is required" })
    }

    console.log(`Verifying payment with reference: ${reference}`)
    const verificationResponse = await verifyPayment(reference as string)

    if (verificationResponse.status && verificationResponse.data.status === "success") {
      // Extract order ID from metadata or reference
      let orderId = verificationResponse.data.metadata?.order_id

      // If no order ID in metadata, try to extract from reference
      if (!orderId) {
        console.log("No order ID in metadata, trying to extract from reference")
        const orderIdMatch = (reference as string).match(/ORDER-([^-]+)-/)
        if (orderIdMatch && orderIdMatch[1]) {
          orderId = orderIdMatch[1]
          console.log(`Extracted order number from reference: ${orderId}`)
        }
      }

      let order = null

      if (orderId) {
        // Update order payment status
        console.log(`Looking for order with ID: ${orderId}`)
        order = await orderModel.getOrderByOrderNumber(orderId)

        if (order) {
          console.log(`Found order with ID ${order.id} for order number ${orderId}`)

          // Update payment status
          await orderModel.updateOrderPaymentStatus(order.id, "completed", reference as string)
          console.log(`Updated payment status to 'completed' for order ${order.id}`)

          // Update order status to processing
          await orderModel.updateOrderStatus(order.id, "processing")
          console.log(`Updated order status to 'processing' for order ${order.id}`)

          // Generate a verification token for this order
          const verificationToken = await createVerificationToken(order.id, order.order_number)
          console.log(`Generated verification token: ${verificationToken.token} for order ${order.id}`)

          return res.status(200).json({
            message: "Payment verified successfully",
            verified: true,
            data: verificationResponse.data,
            token: verificationToken.token,
            orderId: order.order_number,
          })
        } else {
          console.log(`Order not found for order number: ${orderId}`)
        }
      } else {
        console.log("Could not determine order ID from payment reference or metadata")
      }

      // If we reach here, we couldn't find the order or generate a token
      console.log("Payment verified but could not generate token - order not found")
      return res.status(200).json({
        message: "Payment verified successfully but order not found",
        verified: true,
        data: verificationResponse.data,
      })
    } else {
      console.log(`Payment verification failed or incomplete: ${verificationResponse.data.status}`)
      return res.status(200).json({
        message: "Payment not completed",
        verified: false,
        data: verificationResponse.data,
      })
    }
  } catch (error: any) {
    console.error("Error verifying payment:", error)
    return res.status(500).json({ error: error.message || "Internal server error" })
  }
}

// Get order details
export const getOrderDetailsHandler = async (req: NextApiRequest, res: NextApiResponse, orderId: string) => {
  try {
    const result = await orderModel.getOrderDetails(orderId)

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error })
    }

    return res.status(200).json(result.order)
  } catch (error) {
    console.error("Error fetching order details:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Delete order
export const deleteOrderHandler = async (req: NextApiRequest, res: NextApiResponse, orderId: string) => {
  try {
    const result = await orderModel.deleteOrder(orderId)

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error })
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error("Error deleting order:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Delete order item
export const deleteOrderItemHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  orderId: string,
  itemId: string,
) => {
  try {
    const result = await orderModel.deleteOrderItem(orderId, itemId)

    if (result.error) {
      return res.status(result.status || 500).json({ error: result.error })
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error("Error deleting order item:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Update order status
export const updateOrderStatusHandler = async (req: NextApiRequest, res: NextApiResponse, orderId: string) => {
  try {
    const { status } = req.body

    if (!status) {
      return res.status(400).json({ error: "Status is required" })
    }

    const order = await orderModel.updateOrderStatus(orderId, status)

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    return res.status(200).json({
      message: "Order status updated successfully",
      order,
    })
  } catch (error) {
    console.error("Error updating order status:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
export async function getOrdersHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { search, status, payment_status, start_date, end_date, page = 1, limit = 10 } = req.query

    const result = await orderModel.getAllOrders({
      search,
      status,
      payment_status,
      start_date,
      end_date,
      page: Number(page),
      limit: Number(limit),
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
// Update payment status
export const updatePaymentStatusHandler = async (req: NextApiRequest, res: NextApiResponse, orderId: string) => {
  try {
    const { paymentStatus } = req.body

    if (!paymentStatus) {
      return res.status(400).json({ error: "Payment status is required" })
    }

    const order = await orderModel.updateOrderPaymentStatus(orderId, paymentStatus)

    if (!order) {
      return res.status(404).json({ error: "Order not found" })
    }

    return res.status(200).json({
      message: "Payment status updated successfully",
      order,
    })
  } catch (error) {
    console.error("Error updating payment status:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
