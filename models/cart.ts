import { query } from "../database/connection"
import { getProductById } from "./product"

export interface CartItem {
  id: number
  cart_id: number
  product_id: number
  size: string | null
  quantity: number
  created_at: Date
  updated_at: Date
  product?: any
}

export interface Cart {
  id: number
  user_id: number
  created_at: Date
  updated_at: Date
  items: CartItem[]
  total: number
}

export const getCartByUserId = async (user_id: number): Promise<Cart | null> => {
  try {
    // Get the cart
    const cartResult = await query("SELECT * FROM carts WHERE user_id = $1", [user_id])

    if (cartResult.rows.length === 0) {
      // Create a new cart if one doesn't exist
      const newCartResult = await query("INSERT INTO carts (user_id) VALUES ($1) RETURNING *", [user_id])

      return {
        ...newCartResult.rows[0],
        items: [],
        total: 0,
      }
    }

    const cart = cartResult.rows[0]

    // Get cart items
    const cartItemsResult = await query("SELECT * FROM cart_items WHERE cart_id = $1", [cart.id])
    const cartItems = cartItemsResult.rows

    // Get product details for each cart item
    const cartItemsWithProducts = []
    let total = 0

    for (const item of cartItems) {
      const product = await getProductById(item.product_id)

      if (product) {
        cartItemsWithProducts.push({
          ...item,
          product,
        })

        total += product.price * item.quantity
      }
    }

    return {
      ...cart,
      items: cartItemsWithProducts,
      total,
    }
  } catch (error) {
    console.error("Error getting cart by user ID:", error)
    throw error
  }
}

export const addItemToCart = async (
  user_id: number,
  product_id: number,
  quantity: number,
  size?: string,
): Promise<Cart> => {
  try {
    // Get the cart (or create one if it doesn't exist)
    let cartResult = await query("SELECT * FROM carts WHERE user_id = $1", [user_id])

    if (cartResult.rows.length === 0) {
      cartResult = await query("INSERT INTO carts (user_id) VALUES ($1) RETURNING *", [user_id])
    }

    const cart_id = cartResult.rows[0].id

    // Check if the product exists
    const product = await getProductById(product_id)
    if (!product) {
      throw new Error("Product not found")
    }

    // Check if the item is already in the cart
    const existingItemResult = await query(
      "SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND size IS NOT DISTINCT FROM $3",
      [cart_id, product_id, size || null],
    )

    if (existingItemResult.rows.length > 0) {
      // Update the quantity
      const existingItem = existingItemResult.rows[0]
      const newQuantity = existingItem.quantity + quantity

      await query("UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2", [
        newQuantity,
        existingItem.id,
      ])
    } else {
      // Add a new item
      await query("INSERT INTO cart_items (cart_id, product_id, size, quantity) VALUES ($1, $2, $3, $4)", [
        cart_id,
        product_id,
        size || null,
        quantity,
      ])
    }

    // Update the cart's updated_at timestamp
    await query("UPDATE carts SET updated_at = NOW() WHERE id = $1", [cart_id])

    // Return the updated cart
    return getCartByUserId(user_id) as Promise<Cart>
  } catch (error) {
    console.error("Error adding item to cart:", error)
    throw error
  }
}

export const updateCartItem = async (user_id: number, cart_item_id: number, quantity: number): Promise<Cart> => {
  try {
    // Get the cart
    const cartResult = await query("SELECT * FROM carts WHERE user_id = $1", [user_id])

    if (cartResult.rows.length === 0) {
      throw new Error("Cart not found")
    }

    const cart_id = cartResult.rows[0].id

    // Check if the cart item exists and belongs to this cart
    const cartItemResult = await query("SELECT * FROM cart_items WHERE id = $1 AND cart_id = $2", [
      cart_item_id,
      cart_id,
    ])

    if (cartItemResult.rows.length === 0) {
      throw new Error("Cart item not found")
    }

    if (quantity <= 0) {
      // Remove the item if quantity is 0 or negative
      await query("DELETE FROM cart_items WHERE id = $1", [cart_item_id])
    } else {
      // Update the quantity
      await query("UPDATE cart_items SET quantity = $1, updated_at = NOW() WHERE id = $2", [quantity, cart_item_id])
    }

    // Update the cart's updated_at timestamp
    await query("UPDATE carts SET updated_at = NOW() WHERE id = $1", [cart_id])

    // Return the updated cart
    return getCartByUserId(user_id) as Promise<Cart>
  } catch (error) {
    console.error("Error updating cart item:", error)
    throw error
  }
}

export const removeCartItem = async (user_id: number, cart_item_id: number): Promise<Cart> => {
  try {
    // Get the cart
    const cartResult = await query("SELECT * FROM carts WHERE user_id = $1", [user_id])

    if (cartResult.rows.length === 0) {
      throw new Error("Cart not found")
    }

    const cart_id = cartResult.rows[0].id

    // Check if the cart item exists and belongs to this cart
    const cartItemResult = await query("SELECT * FROM cart_items WHERE id = $1 AND cart_id = $2", [
      cart_item_id,
      cart_id,
    ])

    if (cartItemResult.rows.length === 0) {
      throw new Error("Cart item not found")
    }

    // Remove the item
    await query("DELETE FROM cart_items WHERE id = $1", [cart_item_id])

    // Update the cart's updated_at timestamp
    await query("UPDATE carts SET updated_at = NOW() WHERE id = $1", [cart_id])

    // Return the updated cart
    return getCartByUserId(user_id) as Promise<Cart>
  } catch (error) {
    console.error("Error removing cart item:", error)
    throw error
  }
}

export const clearCart = async (user_id: number): Promise<Cart> => {
  try {
    // Get the cart
    const cartResult = await query("SELECT * FROM carts WHERE user_id = $1", [user_id])

    if (cartResult.rows.length === 0) {
      throw new Error("Cart not found")
    }

    const cart_id = cartResult.rows[0].id

    // Remove all items
    await query("DELETE FROM cart_items WHERE cart_id = $1", [cart_id])

    // Update the cart's updated_at timestamp
    await query("UPDATE carts SET updated_at = NOW() WHERE id = $1", [cart_id])

    // Return the updated cart
    return getCartByUserId(user_id) as Promise<Cart>
  } catch (error) {
    console.error("Error clearing cart:", error)
    throw error
  }
}

