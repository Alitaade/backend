import type { NextApiRequest, NextApiResponse } from "next"
import { getCartByUserId, addItemToCart, updateCartItem, removeCartItem, clearCart } from "../models/cart"

export const getCart = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { user_id, userId } = req.query
    const userIdToUse = user_id || userId

    if (!userIdToUse) {
      return res.status(400).json({ error: "User ID is required" })
    }

    try {
      const cart = await getCartByUserId(Number.parseInt(userIdToUse as string))
      return res.status(200).json({ cart })
    } catch (cartError) {
      console.error("Error fetching cart:", cartError)
      // Return empty cart instead of error to prevent UI disruption
      return res.status(200).json({ cart: { items: [], total: 0 } })
    }
  } catch (error) {
    console.error("Error getting cart:", error)
    // Return empty cart instead of error
    return res.status(200).json({ cart: { items: [], total: 0 } })
  }
}

export const addItem = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { user_id, product_id, quantity, size } = req.body

    if (!user_id || !product_id || !quantity) {
      return res.status(400).json({ error: "User ID, product ID, and quantity are required" })
    }

    const cart = await addItemToCart(
      Number.parseInt(user_id as string),
      Number.parseInt(product_id as string),
      Number.parseInt(quantity as string),
      size,
    )

    return res.status(200).json({ message: "Item added to cart", cart })
  } catch (error) {
    console.error("Error adding item to cart:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const updateItem = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { user_id, cart_item_id, quantity } = req.body

    if (!user_id || !cart_item_id || quantity === undefined) {
      return res.status(400).json({ error: "User ID, cart item ID, and quantity are required" })
    }

    const cart = await updateCartItem(
      Number.parseInt(user_id as string),
      Number.parseInt(cart_item_id as string),
      Number.parseInt(quantity as string),
    )

    return res.status(200).json({ message: "Cart item updated", cart })
  } catch (error) {
    console.error("Error updating cart item:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const removeItem = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query // This is the cart_item_id
    const { user_id } = req.query

    console.log("Removing cart item:", { id, user_id })

    if (!user_id || !id) {
      return res.status(400).json({ error: "User ID and cart item ID are required" })
    }

    const cart = await removeCartItem(Number.parseInt(user_id as string), Number.parseInt(id as string))

    return res.status(200).json({ message: "Cart item removed", cart })
  } catch (error) {
    console.error("Error removing cart item:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const clear = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { user_id } = req.query

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" })
    }

    const cart = await clearCart(Number.parseInt(user_id as string))

    return res.status(200).json({ message: "Cart cleared", cart })
  } catch (error) {
    console.error("Error clearing cart:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
