import { query } from "@/database/connection"
import { getCartByUserId, clearCart } from "@/models/cart"
import type { Order, OrderWithItems, CreateOrderFromCartData } from "@/types"

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