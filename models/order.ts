import { query } from "../database/connection"
import { getCartByUserId, clearCart } from "./cart"
import type { Order, CreateOrderFromCartData, OrderWithItems, AdminOrderData } from "@/types"
import { findUserById } from "./user"
// Create order from cart
export const createOrderFromCart = async (
  orderData: CreateOrderFromCartData,
  paymentReference?: string | null,
): Promise<OrderWithItems | null> => {
  try {
    // Start a transaction
    await query("BEGIN")

    // Get the user's cart
    const cart = await getCartByUserId(orderData.user_id)

    if (!cart) {
      throw new Error("Cart not found")
    }

    if (!cart.items || cart.items.length === 0) {
      throw new Error("Cart is empty")
    }

    // Generate a unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Create the order with currency information
    const orderResult = await query(
      `
      INSERT INTO orders (
        user_id, order_number, total_amount, status, 
        shipping_address, shipping_method, payment_method, 
        payment_status, payment_reference, currency_code, currency_rate
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
      `,
      [
        orderData.user_id,
        orderNumber,
        cart.total,
        "pending",
        orderData.shipping_address,
        orderData.shipping_method,
        orderData.payment_method,
        orderData.payment_method === "manual_transfer" ? "awaiting_payment" : "pending",
        paymentReference,
        orderData.currency_code || "USD", // Default to USD if not provided
        orderData.currency_rate || 1, // Default to 1 if not provided
      ],
    )

    const order = orderResult.rows[0]

    // Create order items from cart items
    for (const item of cart.items) {
      await query(
        `INSERT INTO order_items 
    (order_id, product_id, product_name, quantity, price, size) 
   VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          item.product_id,
          item.product.name, // Add product name here
          item.quantity,
          item.product.price,
          item.size,
        ],
      )
    }

    // Clear the cart
    await clearCart(orderData.user_id)

    // Commit the transaction
    await query("COMMIT")

    // Return the order with items
    return getOrderById(order.id) as Promise<OrderWithItems>
  } catch (error) {
    // Rollback the transaction in case of error
    await query("ROLLBACK")
    console.error("Error creating order from cart:", error)
    throw error
  }
}
export const getOrderItems = async (orderId: string) => {
  const itemsResult = await query(
    `
    SELECT oi.*, p.name as product_name
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
    ORDER BY oi.created_at ASC
    `,
    [orderId]
  )
  
  return itemsResult.rows
}

// Get order by ID
export const getOrderById = async (id: number): Promise<OrderWithItems | null> => {
  try {
    const orderResult = await query("SELECT * FROM orders WHERE id = $1", [id])

    if (orderResult.rows.length === 0) {
      return null
    }

    const order = orderResult.rows[0]

    // Get order items
    const itemsResult = await query(
      `
     SELECT oi.*, p.name as product_name, p.price as product_price, 
     (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = true LIMIT 1) as product_image
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = $1
     `,
      [id],
    )

    return {
      ...order,
      items: itemsResult.rows.map((item) => ({
        ...item,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.product_price,
          image: item.product_image,
        },
      })),
    }
  } catch (error) {
    console.error("Error getting order by ID:", error)
    throw error
  }
}

// Get order by partial order number
export const getOrderByPartialOrderNumber = async (partialOrderNumber: string) => {
  try {
    console.log(`Looking for order with partial order_number: ${partialOrderNumber}`)

    // Use LIKE query to find partial matches
    const result = await query(`SELECT * FROM orders WHERE order_number LIKE $1`, [`%${partialOrderNumber}%`])

    if (result.rows.length === 0) {
      console.log(`No orders found with partial order_number: ${partialOrderNumber}`)
      return null
    }

    console.log(`Found order with partial match for order_number: ${partialOrderNumber}`)

    // Get the order items
    const orderItems = await query(
      `
        SELECT oi.*, p.name as product_name, p.price as product_price, 
        (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = true LIMIT 1) as product_image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        `,
      [result.rows[0].id],
    )

    return {
      ...result.rows[0],
      items: orderItems.rows,
    }
  } catch (error) {
    console.error("Error getting order by partial order number:", error)
    throw error
  }
}

// Get order by order number
export const getOrderByOrderNumber = async (orderNumber: string): Promise<OrderWithItems | null> => {
  try {
    console.log(`Looking for order with order_number: ${orderNumber}`)

    // First try exact match
    const orderResult = await query("SELECT * FROM orders WHERE order_number = $1", [orderNumber])

    if (orderResult.rows.length > 0) {
      console.log(`Found order with exact match for order_number: ${orderNumber}`)
      const order = orderResult.rows[0]

      // Get order items
      const itemsResult = await query(
        `
        SELECT oi.*, p.name as product_name, p.price as product_price, 
        (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = true LIMIT 1) as product_image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        `,
        [order.id],
      )

      return {
        ...order,
        items: itemsResult.rows.map((item) => ({
          ...item,
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.product_price,
            image: item.product_image,
          },
        })),
      }
    }

    // If no exact match, try partial match (the order number might be part of a longer string)
    const partialResult = await query("SELECT * FROM orders WHERE order_number LIKE $1", [`%${orderNumber}%`])

    if (partialResult.rows.length > 0) {
      console.log(`Found order with partial match for order_number: ${orderNumber}`)
      const order = partialResult.rows[0]

      // Get order items
      const itemsResult = await query(
        `
        SELECT oi.*, p.name as product_name, p.price as product_price, 
        (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = true LIMIT 1) as product_image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        `,
        [order.id],
      )

      return {
        ...order,
        items: itemsResult.rows.map((item) => ({
          ...item,
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.product_price,
            image: item.product_image,
          },
        })),
      }
    }

    console.log(`No order found for order_number: ${orderNumber}`)
    return null
  } catch (error) {
    console.error("Error getting order by order number:", error)
    throw error
  }
}
export const deleteAllUserOrders = async (userId: number): Promise<{ success: boolean; count: number; message: string }> => {
  try {
    // Check if user exists
    const user = await findUserById(userId)
    if (!user) {
      throw new Error("User not found")
    }

    // Begin transaction
    await query("BEGIN")

    try {
      // First delete all order items for all orders of this user
      await query(
        `
        DELETE FROM order_items 
        WHERE order_id IN (SELECT id FROM orders WHERE user_id = $1)
        `,
        [userId],
      )

      // Then delete all orders for this user
      const ordersResult = await query("DELETE FROM orders WHERE user_id = $1 RETURNING id", [userId])

      // Commit transaction
      await query("COMMIT")

      const deletedCount = ordersResult.rowCount || 0
      console.log(`Successfully deleted ${deletedCount} orders for user ${userId}`)

      return {
        success: true,
        count: deletedCount,
        message: `Successfully deleted ${deletedCount} orders for user ${userId}`
      }
    } catch (error) {
      // Rollback transaction on error
      await query("ROLLBACK")
      console.error(`Error deleting orders for user ${userId}:`, error)
      throw error
    }
  } catch (error) {
    console.error("Error in deleteAllUserOrders:", error)
    throw error
  }
}

// Create order from admin panel
export const createOrderFromAdmin = async (orderData: AdminOrderData): Promise<OrderWithItems> => {
  try {
    // Start a transaction
    await query("BEGIN")

    // Generate a unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    // Calculate total amount
    let totalAmount = 0
    for (const item of orderData.items) {
      // Get product price
      const productResult = await query("SELECT price FROM products WHERE id = $1", [item.product_id])
      if (productResult.rows.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found`)
      }
      const productPrice = Number.parseFloat(productResult.rows[0].price)
      totalAmount += productPrice * item.quantity
    }

    // Create the order
    const orderResult = await query(
      `
      INSERT INTO orders (
        user_id, order_number, total_amount, status, 
        shipping_address, shipping_method, payment_method, 
        payment_status, currency_code, currency_rate
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
      `,
      [
        orderData.user_id,
        orderNumber,
        totalAmount,
        "pending",
        orderData.shipping_address,
        orderData.shipping_method,
        orderData.payment_method,
        "pending",
        "USD", // Default to USD
        1, // Default rate
      ],
    )

    const order = orderResult.rows[0]

    // Create order items
    for (const item of orderData.items) {
      // Get product details
      const productResult = await query("SELECT name, price FROM products WHERE id = $1", [item.product_id])
      if (productResult.rows.length === 0) {
        throw new Error(`Product with ID ${item.product_id} not found`)
      }
      const product = productResult.rows[0]

      await query(
        `INSERT INTO order_items 
        (order_id, product_id, product_name, quantity, price, size) 
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, item.product_id, product.name, item.quantity, product.price, item.size || null],
      )
    }

    // Commit the transaction
    await query("COMMIT")

    // Return the order with items
    return getOrderById(order.id) as Promise<OrderWithItems>
  } catch (error) {
    // Rollback the transaction in case of error
    await query("ROLLBACK")
    console.error("Error creating order from admin:", error)
    throw error
  }
}


// Get user orders
export const getUserOrders = async (userId: number): Promise<OrderWithItems[]> => {
  try {
    const ordersResult = await query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [userId])

    const orders = []

    for (const order of ordersResult.rows) {
      // Get order items
      const itemsResult = await query(
        `
       SELECT oi.*, p.name as product_name, p.price as product_price, 
       (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = true LIMIT 1) as product_image
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       `,
        [order.id],
      )

      orders.push({
        ...order,
        items: itemsResult.rows.map((item) => ({
          ...item,
          product: {
            id: item.product_id,
            name: item.product_name,
            price: item.product_price,
            image: item.product_image,
          },
        })),
      })
    }

    return orders
  } catch (error) {
    console.error("Error getting user orders:", error)
    throw error
  }
}

// Update order status
export const updateOrderStatus = async (id: number | string, status: string): Promise<Order | null> => {
  try {
    // Validate status
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"]
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status. Must be one of: pending, processing, shipped, delivered, cancelled")
    }

    const result = await query("UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [
      status,
      id,
    ])

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error updating order status:", error)
    throw error
  }
}

// Update order payment status
export const updateOrderPaymentStatus = async (
  id: number | string,
  paymentStatus: string,
  paymentReference?: string,
): Promise<Order | null> => {
  try {
    let result
    const now = new Date()

    // Log the update attempt
    console.log(
      `Attempting to update order ${id} payment status to ${paymentStatus}${
        paymentReference ? ` with reference ${paymentReference}` : ""
      }`,
    )

    if (paymentReference) {
      if (paymentStatus === "completed") {
        // If payment is completed, also set the payment_date
        result = await query(
          "UPDATE orders SET payment_status = $1, payment_reference = $2, payment_date = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
          [paymentStatus, paymentReference, now, id],
        )
        console.log(
          `Updated order ${id} payment status to ${paymentStatus} with reference ${paymentReference} and date ${now}`,
        )
      } else {
        result = await query(
          "UPDATE orders SET payment_status = $1, payment_reference = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
          [paymentStatus, paymentReference, id],
        )
        console.log(`Updated order ${id} payment status to ${paymentStatus} with reference ${paymentReference}`)
      }
    } else {
      if (paymentStatus === "completed") {
        // If payment is completed, also set the payment_date
        result = await query(
          "UPDATE orders SET payment_status = $1, payment_date = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
          [paymentStatus, now, id],
        )
        console.log(`Updated order ${id} payment status to ${paymentStatus} with date ${now}`)
      } else {
        result = await query("UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [
          paymentStatus,
          id,
        ])
        console.log(`Updated order ${id} payment status to ${paymentStatus}`)
      }
    }

    if (result.rows.length === 0) {
      console.error(`No rows updated for order ${id}`)
      return null
    }

    // Double-check that the update was successful
    const checkResult = await query("SELECT * FROM orders WHERE id = $1", [id])
    if (checkResult.rows.length > 0) {
      console.log(`Verified order ${id} now has payment_status: ${checkResult.rows[0].payment_status}`)
    }

    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error updating order payment status:", error)
    throw error
  }
}
export const updateOrderPaymentStatusAdmin = async (orderId: number, paymentStatus: string, paymentReference?: string) => {
  const queryParams = [paymentStatus, orderId]
  let updateQuery = `
    UPDATE orders 
    SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
  `
  
  // Add payment reference if provided
  if (paymentReference) {
    updateQuery += ", payment_reference = $3"
    queryParams.push(paymentReference)
  }
  
  // If payment is completed, update payment date
  if (paymentStatus === "completed") {
    updateQuery += ", payment_date = CURRENT_TIMESTAMP"
  }
  
  updateQuery += " WHERE id = $2 RETURNING *"
  
  const result = await query(updateQuery, queryParams)
  return result.rows[0]
}

export async function getAllOrders(params: {
  search?: string | string[]
  status?: string | string[]
  payment_status?: string | string[]
  start_date?: string | string[]
  end_date?: string | string[]
  page?: number
  limit?: number
  order_id?: string | string[] // Add order_id parameter
}) {
  try {
    const { search, status, payment_status, start_date, end_date, page = 1, limit = 10, order_id } = params

    // Build the SQL query
    let sqlQuery = `
      SELECT o.*, 
             u.first_name, u.last_name, u.email, u.id as user_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `
    const queryParams: any[] = []
    let paramIndex = 1

    // Add order_id filter (exact match)
    if (order_id) {
      sqlQuery += ` AND o.id = $${paramIndex}`
      queryParams.push(order_id)
      paramIndex++
    }

    // Add search filter
    if (search) {
      sqlQuery += ` AND (
        o.order_number ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.first_name ILIKE $${paramIndex} OR
        u.last_name ILIKE $${paramIndex} OR
        CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Add status filter
    if (status) {
      sqlQuery += ` AND o.status = $${paramIndex}`
      queryParams.push(status)
      paramIndex++
    }

    // Add payment status filter
    if (payment_status) {
      sqlQuery += ` AND o.payment_status = $${paramIndex}`
      queryParams.push(payment_status)
      paramIndex++
    }

    // Add date range filters
    if (start_date) {
      sqlQuery += ` AND o.created_at >= $${paramIndex}`
      queryParams.push(new Date(start_date as string))
      paramIndex++
    }

    if (end_date) {
      sqlQuery += ` AND o.created_at <= $${paramIndex}`
      queryParams.push(new Date(end_date as string))
      paramIndex++
    }

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (${sqlQuery}) as filtered_orders
    `
    const countResult = await query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0].total)

    // Add pagination
    const offset = (Number(page) - 1) * Number(limit)
    sqlQuery += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(Number(limit), offset)

    // Execute the query
    const result = await query(sqlQuery, queryParams)

    // Format the response data
    const formattedOrders = result.rows.map((order) => {
      return {
        ...order,
        user: {
          id: order.user_id,
          first_name: order.first_name,
          last_name: order.last_name,
          email: order.email,
        },
      }
    })

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit))

    return {
      data: formattedOrders,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    }
  } catch (error) {
    console.error("Error in getAllOrders model:", error)
    throw error
  }
}

// Get order by payment reference
export const getOrderByPaymentReference = async (paymentReference: string): Promise<Order | null> => {
  try {
    // First try exact match
    const result = await query("SELECT * FROM orders WHERE payment_reference = $1", [paymentReference])

    if (result.rows.length > 0) {
      return result.rows[0]
    }

    // If no exact match, try partial match (some systems might store only part of the reference)
    const partialResult = await query("SELECT * FROM orders WHERE payment_reference LIKE $1", [`%${paymentReference}%`])

    if (partialResult.rows.length > 0) {
      console.log(`Found order with partial payment reference match: ${partialResult.rows[0].id}`)
      return partialResult.rows[0]
    }

    // Try to extract order number from reference (common format: ORDER-{orderNumber}-{timestamp})
    const orderIdMatch = paymentReference.match(/ORDER-([^-]+)-/)
    if (orderIdMatch && orderIdMatch[1]) {
      const orderByNumber = await getOrderByOrderNumber(orderIdMatch[1])
      if (orderByNumber) {
        console.log(`Found order by extracted order number: ${orderByNumber.id}`)
        return orderByNumber
      }
    }

    return null
  } catch (error) {
    console.error("Error getting order by payment reference:", error)
    throw error
  }
}

// Delete order item
export const deleteOrderItem = async (orderId: string, itemId: string) => {
  try {
    // Begin transaction
    await query("BEGIN")

    // First, get the item details to calculate order total adjustment
    const itemResult = await query(`SELECT price, quantity FROM order_items WHERE id = $1 AND order_id = $2`, [
      itemId,
      orderId,
    ])

    if (itemResult.rows.length === 0) {
      await query("ROLLBACK")
      return { error: "Order item not found", status: 404 }
    }

    const item = itemResult.rows[0]
    const itemTotal = Number.parseFloat(item.price) * item.quantity

    // Delete the order item
    await query(`DELETE FROM order_items WHERE id = $1 AND order_id = $2`, [itemId, orderId])

    // Update the order's total amount
    await query(`UPDATE orders SET total_amount = total_amount - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [
      itemTotal,
      orderId,
    ])

    // Check if any items remain
    const remainingItemsResult = await query(`SELECT COUNT(*) as count FROM order_items WHERE order_id = $1`, [orderId])

    const remainingItemsCount = Number.parseInt(remainingItemsResult.rows[0].count)

    // If this was the last item, consider changing order status
    if (remainingItemsCount === 0) {
      await query(`UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [orderId])
    }

    // Commit transaction
    await query("COMMIT")

    return {
      success: true,
      message: "Order item deleted successfully",
      updatedOrderTotal: remainingItemsCount === 0 ? 0 : null,
    }
  } catch (error) {
    // Rollback transaction on error
    await query("ROLLBACK")
    console.error("Error deleting order item:", error)
    return { error: "Internal server error", status: 500 }
  }
}

// Get order details
export const getOrderDetails = async (orderId: string) => {
  try {
    // Get order details
    const orderResult = await query(
      `
      SELECT o.*, 
             u.first_name, u.last_name, u.email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
      `,
      [orderId],
    )

    if (orderResult.rows.length === 0) {
      return { error: "Order not found", status: 404 }
    }

    const order = orderResult.rows[0]

    // Format response with user info
    const formattedOrder = {
      ...order,
      user: {
        first_name: order.first_name,
        last_name: order.last_name,
        email: order.email,
      },
    }

    return { order: formattedOrder }
  } catch (error) {
    console.error("Error fetching order details:", error)
    return { error: "Internal server error", status: 500 }
  }
}

export const checkOrderExists = async (orderId: string) => {
  const orderCheck = await query(
    "SELECT id FROM orders WHERE id = $1",
    [orderId]
  )
  return orderCheck.rows.length > 0
}

export const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
  // Update fields based on payment status
  let updateFields = "payment_status = $1, updated_at = CURRENT_TIMESTAMP"
  const queryParams = [paymentStatus, orderId]
  
  // If status is changing to 'paid', update payment date
  if (paymentStatus === 'paid') {
    updateFields += ", payment_date = CURRENT_TIMESTAMP"
  }

  // Update order payment status
  const result = await query(
    `
    UPDATE orders 
    SET ${updateFields}
    WHERE id = $2
    RETURNING id, order_number, payment_status, payment_date
    `,
    queryParams
  )

  return result.rows[0]
}

/**
 * Get valid payment statuses
 */
export const getValidPaymentStatuses = () => {
  return ['pending', 'paid', 'failed', 'refunded']
}

// Delete order
export const deleteOrder = async (orderId: string) => {
  try {
    // Begin transaction
    await query("BEGIN")

    // Delete order items first (cascade should handle this, but being explicit)
    await query("DELETE FROM order_items WHERE order_id = $1", [orderId])

    // Delete the order
    const result = await query("DELETE FROM orders WHERE id = $1 RETURNING *", [orderId])

    // Commit transaction
    await query("COMMIT")

    if (result.rowCount === 0) {
      return { error: "Order not found", status: 404 }
    }

    return { message: "Order deleted successfully" }
  } catch (error) {
    // Rollback transaction on error
    await query("ROLLBACK")
    console.error("Error deleting order:", error)
    return { error: "Internal server error", status: 500 }
  }
}
