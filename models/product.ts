import { query } from "../database/connection"
import type { ProductInput, ProductSize, ProductImage, ProductWithDetails } from "../types"

export const getAllProducts = async (
  limit = 10000, // Setting a very high default limit to effectively get all products
  offset = 0,
  category_id?: number,
  sort = "id",
  order = "asc",
): Promise<ProductWithDetails[]> => {
  try {
    // Validate sort field to prevent SQL injection
    const validSortFields = ["id", "name", "price", "created_at", "stock_quantity"]
    const sortField = validSortFields.includes(sort) ? sort : "id"

    // Validate order direction
    const orderDirection = order.toLowerCase() === "desc" ? "DESC" : "ASC"

    let queryText = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `

    const queryParams: any[] = []
    let paramCounter = 1

    if (category_id) {
      queryText += ` WHERE p.category_id = $${paramCounter++}`
      queryParams.push(category_id)
    }

    queryText += ` ORDER BY p.${sortField} ${orderDirection} LIMIT $${paramCounter++} OFFSET $${paramCounter++}`
    queryParams.push(limit, offset)

    const productsResult = await query(queryText, queryParams)
    const products = productsResult.rows

    // Get images and sizes for each product
    const productsWithDetails: ProductWithDetails[] = []

    for (const product of products) {
      const imagesResult = await query("SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC", [
        product.id,
      ])

      const sizesResult = await query("SELECT * FROM product_sizes WHERE product_id = $1", [product.id])

      productsWithDetails.push({
        ...product,
        images: imagesResult.rows,
        sizes: sizesResult.rows,
      })
    }

    return productsWithDetails
  } catch (error) {
    console.error("Error getting all products:", error)
    throw error
  }
}

// Add a function to get all products without pagination
export const getAllProductsWithoutPagination = async (
  category_id?: number,
  sort = "id",
  order = "asc",
): Promise<ProductWithDetails[]> => {
  try {
    // Validate sort field to prevent SQL injection
    const validSortFields = ["id", "name", "price", "created_at", "stock_quantity"]
    const sortField = validSortFields.includes(sort) ? sort : "id"

    // Validate order direction
    const orderDirection = order.toLowerCase() === "desc" ? "DESC" : "ASC"

    let queryText = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `

    const queryParams: any[] = []
    let paramCounter = 1

    if (category_id) {
      queryText += ` WHERE p.category_id = $${paramCounter++}`
      queryParams.push(category_id)
    }

    queryText += ` ORDER BY p.${sortField} ${orderDirection}`

    const productsResult = await query(queryText, queryParams)
    const products = productsResult.rows

    // Get images and sizes for each product
    const productsWithDetails: ProductWithDetails[] = []

    for (const product of products) {
      const imagesResult = await query("SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC", [
        product.id,
      ])

      const sizesResult = await query("SELECT * FROM product_sizes WHERE product_id = $1", [product.id])

      productsWithDetails.push({
        ...product,
        images: imagesResult.rows,
        sizes: sizesResult.rows,
      })
    }

    return productsWithDetails
  } catch (error) {
    console.error("Error getting all products:", error)
    throw error
  }
}

// Rest of the code remains the same...
export const countProducts = async (category_id?: number): Promise<number> => {
  try {
    let queryText = "SELECT COUNT(*) as total FROM products"
    const queryParams: any[] = []

    if (category_id) {
      queryText += " WHERE category_id = $1"
      queryParams.push(category_id)
    }

    const result = await query(queryText, queryParams)
    return Number.parseInt(result.rows[0].total, 10)
  } catch (error) {
    console.error("Error counting products:", error)
    throw error
  }
}

export const getProductById = async (id: number): Promise<ProductWithDetails | null> => {
  try {
    const productResult = await query(
      `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
      `,
      [id],
    )

    if (productResult.rows.length === 0) {
      return null
    }

    const product = productResult.rows[0]

    // Get images
    const imagesResult = await query("SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC", [
      id,
    ])

    // Get sizes
    const sizesResult = await query("SELECT * FROM product_sizes WHERE product_id = $1", [id])

    return {
      ...product,
      images: imagesResult.rows,
      sizes: sizesResult.rows,
    }
  } catch (error) {
    console.error("Error getting product by ID:", error)
    throw error
  }
}

export const createProduct = async (
  productData: ProductInput,
  sizes?: { size: string; stock_quantity: number }[],
  images?: {
    image_url: string
    is_primary?: boolean
    width?: number
    height?: number
    alt_text?: string
  }[],
): Promise<ProductWithDetails> => {
  try {
    // Start a transaction
    await query("BEGIN")

    // Insert the product
    const productResult = await query(
      "INSERT INTO products (name, description, price, category_id, stock_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        productData.name,
        productData.description || null,
        productData.price,
        productData.category_id || null,
        productData.stock_quantity || 0,
      ],
    )

    const product = productResult.rows[0]

    // Insert sizes if provided
    if (sizes && sizes.length > 0) {
      for (const size of sizes) {
        await query("INSERT INTO product_sizes (product_id, size, stock_quantity) VALUES ($1, $2, $3)", [
          product.id,
          size.size,
          size.stock_quantity,
        ])
      }
    }

    // Insert images if provided
    if (images && images.length > 0) {
      for (const image of images) {
        await query(
          "INSERT INTO product_images (product_id, image_url, is_primary, width, height, alt_text) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            product.id,
            image.image_url,
            image.is_primary || false,
            image.width || null,
            image.height || null,
            image.alt_text || null,
          ],
        )
      }
    }

    // Commit the transaction
    await query("COMMIT")

    // Return the product with details
    return getProductById(product.id) as Promise<ProductWithDetails>
  } catch (error) {
    // Rollback the transaction in case of error
    await query("ROLLBACK")
    console.error("Error creating product:", error)
    throw error
  }
}

export const updateProduct = async (
  id: number,
  productData: Partial<ProductInput>,
): Promise<ProductWithDetails | null> => {
  try {
    // Start building the query
    let queryText = "UPDATE products SET "
    const queryParams: any[] = []
    let paramCounter = 1

    // Add each field that needs to be updated
    const updates: string[] = []

    if (productData.name !== undefined) {
      updates.push(`name = $${paramCounter++}`)
      queryParams.push(productData.name)
    }

    if (productData.description !== undefined) {
      updates.push(`description = $${paramCounter++}`)
      queryParams.push(productData.description)
    }

    if (productData.price !== undefined) {
      updates.push(`price = $${paramCounter++}`)
      queryParams.push(productData.price)
    }

    if (productData.category_id !== undefined) {
      updates.push(`category_id = $${paramCounter++}`)
      queryParams.push(productData.category_id)
    }

    if (productData.stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramCounter++}`)
      queryParams.push(productData.stock_quantity)
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramCounter++}`)
    queryParams.push(new Date())

    // If there's nothing to update, return the current product
    if (updates.length === 0) {
      return getProductById(id)
    }

    // Complete the query
    queryText += updates.join(", ")
    queryText += ` WHERE id = $${paramCounter} RETURNING *`
    queryParams.push(id)

    // Execute the query
    const result = await query(queryText, queryParams)

    if (result.rows.length === 0) {
      return null
    }

    // Return the updated product with details
    return getProductById(id)
  } catch (error) {
    console.error("Error updating product:", error)
    throw error
  }
}

export const deleteProduct = async (id: number): Promise<boolean> => {
  try {
    // Start a transaction
    await query("BEGIN")

    // Delete related records first
    await query("DELETE FROM product_images WHERE product_id = $1", [id])
    await query("DELETE FROM product_sizes WHERE product_id = $1", [id])

    // Delete the product
    const result = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id])

    // Commit the transaction
    await query("COMMIT")

    return result.rows.length > 0
  } catch (error) {
    // Rollback the transaction in case of error
    await query("ROLLBACK")
    console.error("Error deleting product:", error)
    throw error
  }
}

export const addProductImage = async (
  product_id: number,
  image_url: string,
  is_primary = false,
  width?: number,
  height?: number,
  alt_text?: string,
): Promise<ProductImage> => {
  try {
    // If this is a primary image, update all other images to non-primary
    if (is_primary) {
      await query("UPDATE product_images SET is_primary = false WHERE product_id = $1", [product_id])
    }

    const result = await query(
      "INSERT INTO product_images (product_id, image_url, is_primary, width, height, alt_text) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [product_id, image_url, is_primary, width || null, height || null, alt_text || null],
    )

    return result.rows[0]
  } catch (error) {
    console.error("Error adding product image:", error)
    throw error
  }
}

export const deleteProductImage = async (id: number): Promise<boolean> => {
  try {
    const result = await query("DELETE FROM product_images WHERE id = $1 RETURNING id", [id])
    return result.rows.length > 0
  } catch (error) {
    console.error("Error deleting product image:", error)
    throw error
  }
}

export const updateProductSize = async (
  product_id: number,
  size: string,
  stock_quantity: number,
): Promise<ProductSize> => {
  try {
    // Check if the size already exists for this product
    const existingSize = await query("SELECT * FROM product_sizes WHERE product_id = $1 AND size = $2", [
      product_id,
      size,
    ])

    if (existingSize.rows.length > 0) {
      // Update existing size
      const result = await query(
        "UPDATE product_sizes SET stock_quantity = $1 WHERE product_id = $2 AND size = $3 RETURNING *",
        [stock_quantity, product_id, size],
      )
      return result.rows[0]
    } else {
      // Insert new size
      const result = await query(
        "INSERT INTO product_sizes (product_id, size, stock_quantity) VALUES ($1, $2, $3) RETURNING *",
        [product_id, size, stock_quantity],
      )
      return result.rows[0]
    }
  } catch (error) {
    console.error("Error updating product size:", error)
    throw error
  }
}

export const deleteProductSize = async (id: number): Promise<boolean> => {
  try {
    const result = await query("DELETE FROM product_sizes WHERE id = $1 RETURNING id", [id])
    return result.rows.length > 0
  } catch (error) {
    console.error("Error deleting product size:", error)
    throw error
  }
}

export const setProductImageAsPrimary = async (productId: number, imageId: number): Promise<boolean> => {
  try {
    // Start a transaction
    await query("BEGIN")

    // Check if the image exists and belongs to the product
    const imageCheck = await query("SELECT id FROM product_images WHERE id = $1 AND product_id = $2", [
      imageId,
      productId,
    ])

    if (imageCheck.rows.length === 0) {
      await query("ROLLBACK")
      return false
    }

    // Set all images of this product to non-primary
    await query("UPDATE product_images SET is_primary = false WHERE product_id = $1", [productId])

    // Set the specified image as primary
    await query("UPDATE product_images SET is_primary = true WHERE id = $1", [imageId])

    // Commit the transaction
    await query("COMMIT")

    return true
  } catch (error) {
    await query("ROLLBACK")
    console.error("Error setting product image as primary:", error)
    throw error
  }
}

export const searchProductsByQuery = async (searchQuery: string): Promise<ProductWithDetails[]> => {
  try {
    const searchQueryText = `%${searchQuery}%`

    const productsResult = await query(
      `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 
        p.name ILIKE $1 OR
        p.description ILIKE $1
      ORDER BY p.created_at DESC
      LIMIT 50
      `,
      [searchQueryText],
    )

    const products = productsResult.rows

    // Get images and sizes for each product
    const productsWithDetails: ProductWithDetails[] = []

    for (const product of products) {
      const imagesResult = await query("SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC", [
        product.id,
      ])

      const sizesResult = await query("SELECT * FROM product_sizes WHERE product_id = $1", [product.id])

      productsWithDetails.push({
        ...product,
        images: imagesResult.rows,
        sizes: sizesResult.rows,
      })
    }

    return productsWithDetails
  } catch (error) {
    console.error("Error searching products:", error)
    throw error
  }
}

export const addProductSize = async (
  product_id: number,
  size: string,
  stock_quantity: number,
): Promise<ProductSize> => {
  try {
    // Check if the size already exists for this product
    const existingSize = await query("SELECT * FROM product_sizes WHERE product_id = $1 AND size = $2", [
      product_id,
      size,
    ])

    if (existingSize.rows.length > 0) {
      throw new Error("Size already exists for this product")
    }

    // Insert new size
    const result = await query(
      "INSERT INTO product_sizes (product_id, size, stock_quantity) VALUES ($1, $2, $3) RETURNING *",
      [product_id, size, stock_quantity],
    )

    return result.rows[0]
  } catch (error) {
    console.error("Error adding product size:", error)
    throw error
  }
}

export const addProductImageByUrl = async (
  product_id: number,
  image_url: string,
  is_primary: boolean,
  width?: number,
  height?: number,
  alt_text?: string,
): Promise<ProductImage> => {
  try {
    // If this is a primary image, update all other images to non-primary
    if (is_primary) {
      await query("UPDATE product_images SET is_primary = false WHERE product_id = $1", [product_id])
    }

    const result = await query(
      "INSERT INTO product_images (product_id, image_url, is_primary, width, height, alt_text) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [product_id, image_url, is_primary, width || null, height || null, alt_text || null],
    )

    return result.rows[0]
  } catch (error) {
    console.error("Error adding product image by URL:", error)
    throw error
  }
}
