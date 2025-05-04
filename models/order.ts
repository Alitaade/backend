import { query } from "../database/connection";
import { getCartByUserId, clearCart } from "./cart";
import { Order, CreateOrderFromCartData, OrderWithItems } from "@/types"

// Update the createOrderFromCart function to handle currency information
export const createOrderFromCart = async (
  orderData: CreateOrderFromCartData,
  paymentReference?: string | null
): Promise<OrderWithItems | null> => {
  try {
    // Start a transaction
    await query("BEGIN");

    // Get the user's cart
    const cart = await getCartByUserId(orderData.user_id);

    if (!cart) {
      throw new Error("Cart not found");
    }

    if (!cart.items || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Generate a unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
        orderData.payment_method === "manual_transfer"
          ? "awaiting_payment"
          : "pending",
        paymentReference,
        orderData.currency_code || "USD", // Default to USD if not provided
        orderData.currency_rate || 1, // Default to 1 if not provided
      ]
    );

    const order = orderResult.rows[0];

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
        ]
      );
    }

    // Clear the cart
    await clearCart(orderData.user_id);

    // Commit the transaction
    await query("COMMIT");

    // Return the order with items
    return getOrderById(order.id) as Promise<OrderWithItems>;
  } catch (error) {
    // Rollback the transaction in case of error
    await query("ROLLBACK");
    console.error("Error creating order from cart:", error);
    throw error;
  }
};

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

// Add this function to get an order by partial order number match
export const getOrderByPartialOrderNumber = async (
  partialOrderNumber: string
) => {
  try {
    console.log(
      `Looking for order with partial order_number: ${partialOrderNumber}`
    );

    // Use LIKE query to find partial matches
    const result = await query(
      `SELECT * FROM orders WHERE order_number LIKE $1`,
      [`%${partialOrderNumber}%`]
    );

    if (result.rows.length === 0) {
      console.log(
        `No orders found with partial order_number: ${partialOrderNumber}`
      );
      return null;
    }

    console.log(
      `Found order with partial match for order_number: ${partialOrderNumber}`
    );

    // Get the order items
    const orderItems = await query(
      `
        SELECT oi.*, p.name as product_name, p.price as product_price, 
        (SELECT image_url FROM product_images WHERE product_id = oi.product_id AND is_primary = true LIMIT 1) as product_image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = $1
        `,
      [result.rows[0].id]
    );

    return {
      ...result.rows[0],
      items: orderItems.rows,
    };
  } catch (error) {
    console.error("Error getting order by partial order number:", error);
    throw error;
  }
};

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

export const getUserOrders = async (
  userId: number
): Promise<OrderWithItems[]> => {
  try {
    const ordersResult = await query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );

    const orders = [];

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
        [order.id]
      );

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
      });
    }

    return orders;
  } catch (error) {
    console.error("Error getting user orders:", error);
    throw error;
  }
};

export const updateOrderStatus = async (
  id: number,
  status: string
): Promise<Order | null> => {
  try {
    const result = await query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

// Ensure updateOrderPaymentStatus is robust
export const updateOrderPaymentStatus = async (
  id: number,
  paymentStatus: string,
  paymentReference?: string
): Promise<Order | null> => {
  try {
    let result;
    const now = new Date();

    // Log the update attempt
    console.log(
      `Attempting to update order ${id} payment status to ${paymentStatus}${
        paymentReference ? ` with reference ${paymentReference}` : ""
      }`
    );

    if (paymentReference) {
      if (paymentStatus === "completed") {
        // If payment is completed, also set the payment_date
        result = await query(
          "UPDATE orders SET payment_status = $1, payment_reference = $2, payment_date = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
          [paymentStatus, paymentReference, now, id]
        );
        console.log(
          `Updated order ${id} payment status to ${paymentStatus} with reference ${paymentReference} and date ${now}`
        );
      } else {
        result = await query(
          "UPDATE orders SET payment_status = $1, payment_reference = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
          [paymentStatus, paymentReference, id]
        );
        console.log(
          `Updated order ${id} payment status to ${paymentStatus} with reference ${paymentReference}`
        );
      }
    } else {
      if (paymentStatus === "completed") {
        // If payment is completed, also set the payment_date
        result = await query(
          "UPDATE orders SET payment_status = $1, payment_date = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
          [paymentStatus, now, id]
        );
        console.log(
          `Updated order ${id} payment status to ${paymentStatus} with date ${now}`
        );
      } else {
        result = await query(
          "UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
          [paymentStatus, id]
        );
        console.log(`Updated order ${id} payment status to ${paymentStatus}`);
      }
    }

    if (result.rows.length === 0) {
      console.error(`No rows updated for order ${id}`);
      return null;
    }

    // Double-check that the update was successful
    const checkResult = await query("SELECT * FROM orders WHERE id = $1", [id]);
    if (checkResult.rows.length > 0) {
      console.log(
        `Verified order ${id} now has payment_status: ${checkResult.rows[0].payment_status}`
      );
    }

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error updating order payment status:", error);
    throw error;
  }
};

export const getAllOrders = async (
  limit = 50,
  offset = 0,
  status?: string
): Promise<{ orders: OrderWithItems[]; total: number }> => {
  try {
    let queryText = "SELECT * FROM orders";
    const queryParams: any[] = [];
    let paramCounter = 1;

    if (status) {
      queryText += ` WHERE status = $${paramCounter++}`;
      queryParams.push(status);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCounter++} OFFSET $${paramCounter++}`;
    queryParams.push(limit, offset);

    const ordersResult = await query(queryText, queryParams);

    // Get total count
    let countQueryText = "SELECT COUNT(*) FROM orders";
    const countQueryParams: any[] = [];
    paramCounter = 1;

    if (status) {
      countQueryText += " WHERE status = $1";
      countQueryParams.push(status);
    }

    const countResult = await query(countQueryText, countQueryParams);
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const orders = [];

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
        [order.id]
      );

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
      });
    }

    return { orders, total };
  } catch (error) {
    console.error("Error getting all orders:", error);
    throw error;
  }
};

export const getOrderByPaymentReference = async (
  paymentReference: string
): Promise<Order | null> => {
  try {
    // First try exact match
    const result = await query(
      "SELECT * FROM orders WHERE payment_reference = $1",
      [paymentReference]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // If no exact match, try partial match (some systems might store only part of the reference)
    const partialResult = await query(
      "SELECT * FROM orders WHERE payment_reference LIKE $1",
      [`%${paymentReference}%`]
    );

    if (partialResult.rows.length > 0) {
      console.log(
        `Found order with partial payment reference match: ${partialResult.rows[0].id}`
      );
      return partialResult.rows[0];
    }

    // Try to extract order number from reference (common format: ORDER-{orderNumber}-{timestamp})
    const orderIdMatch = paymentReference.match(/ORDER-([^-]+)-/);
    if (orderIdMatch && orderIdMatch[1]) {
      const orderByNumber = await getOrderByOrderNumber(orderIdMatch[1]);
      if (orderByNumber) {
        console.log(
          `Found order by extracted order number: ${orderByNumber.id}`
        );
        return orderByNumber;
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting order by payment reference:", error);
    throw error;
  }
};
