import { query } from "../database/connection"
import type { ProductInput, ProductSize, ProductImage, ProductWithDetails } from "../types"

// Add this new function to force delete a product and all its references
export const forceDeleteProduct = async (id: number): Promise<{ success: boolean; message?: string }> => {
  try {
    // Start a transaction
    await query("BEGIN")

    try {
      // 1. Delete from order_items first (this breaks the foreign key constraint)
      await query("DELETE FROM order_items WHERE product_id = $1", [id])

      // 2. Delete from cart_items
      await query("DELETE FROM cart_items WHERE product_id = $1", [id])

      // 3. Delete product images
      await query("DELETE FROM product_images WHERE product_id = $1", [id])

      // 4. Delete product sizes
      await query("DELETE FROM product_sizes WHERE product_id = $1", [id])

      // 5. Finally delete the product itself
      const result = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id])

      if (result.rows.length === 0) {
        await query("ROLLBACK")
        return { success: false, message: "Product not found" }
      }

      // Commit the transaction
      await query("COMMIT")
      return { success: true }
    } catch (error) {
      // Rollback the transaction in case of error
      await query("ROLLBACK")
      console.error("Error force deleting product:", error)
      throw error
    }
  } catch (error) {
    console.error("Error in force delete transaction:", error)
    return { success: false, message: error.message || "Unknown error occurred" }
  }
}

// Modify the deleteProduct function to use a soft delete approach
export const deleteProduct = async (id: number): Promise<boolean> => {
  try {
    // Start a transaction
    await query("BEGIN")

    try {
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
  } catch (error) {
    console.error("Error deleting product:", error)
    throw error
  }
}

// Function to calculate total stock from sizes
export const calculateTotalStock = async (productId: number): Promise<number> => {
  try {
    const result = await query("SELECT SUM(stock_quantity) as total FROM product_sizes WHERE product_id = $1", [
      productId,
    ])

    return Number.parseInt(result.rows[0].total || "0", 10)
  } catch (error) {
    console.error("Error calculating total stock:", error)
    return 0
  }
}

// Update the product's total stock based on its sizes
export const updateProductTotalStock = async (productId: number): Promise<boolean> => {
  try {
    const totalStock = await calculateTotalStock(productId)

    await query("UPDATE products SET stock_quantity = $1, updated_at = NOW() WHERE id = $2", [totalStock, productId])

    return true
  } catch (error) {
    console.error("Error updating product total stock:", error)
    return false
  }
}

// Optimized version of the product controller to avoid timeouts

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

    // First, fetch all products in a single query
    let productsQueryText = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
    `

    const queryParams: any[] = []
    let paramCounter = 1

    if (category_id) {
      productsQueryText += ` WHERE p.category_id = $${paramCounter++}`
      queryParams.push(category_id)
    }

    productsQueryText += ` ORDER BY p.${sortField} ${orderDirection}`

    console.log("Executing products query:", productsQueryText, "with params:", queryParams)
    const productsResult = await query(productsQueryText, queryParams)
    const products = productsResult.rows
    console.log(`Products query returned ${products.length} products`)

    if (products.length === 0) {
      return []
    }

    // Extract all product IDs
    const productIds = products.map((p) => p.id)

    // Get all images for these products in a single query
    const imagesQuery = `
      SELECT * FROM product_images 
      WHERE product_id = ANY($1::int[])
      ORDER BY product_id, is_primary DESC
    `
    const imagesResult = await query(imagesQuery, [productIds])

    // Get all sizes for these products in a single query
    const sizesQuery = `
      SELECT * FROM product_sizes
      WHERE product_id = ANY($1::int[])
      ORDER BY product_id
    `
    const sizesResult = await query(sizesQuery, [productIds])

    console.log(`Retrieved ${imagesResult.rows.length} images and ${sizesResult.rows.length} sizes in bulk`)

    // Create a map for quick lookup
    const imagesMap = new Map()
    imagesResult.rows.forEach((img) => {
      if (!imagesMap.has(img.product_id)) {
        imagesMap.set(img.product_id, [])
      }
      imagesMap.get(img.product_id).push(img)
    })

    const sizesMap = new Map()
    sizesResult.rows.forEach((size) => {
      if (!sizesMap.has(size.product_id)) {
        sizesMap.set(size.product_id, [])
      }
      sizesMap.get(size.product_id).push(size)
    })

    // Combine everything into the final result
    const productsWithDetails: ProductWithDetails[] = products.map((product) => ({
      ...product,
      images: imagesMap.get(product.id) || [],
      sizes: sizesMap.get(product.id) || [],
    }))

    return productsWithDetails
  } catch (error) {
    console.error("Error getting all products:", error)
    throw error
  }
}

// Similarly optimize the paginated version of getAllProducts
export const getAllProducts = async (
  limit = 10,
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

    console.log("Executing paginated query:", queryText, "with params:", queryParams)

    const productsResult = await query(queryText, queryParams)
    const products = productsResult.rows
    console.log(`Query returned ${products.length} products for page`)

    if (products.length === 0) {
      return []
    }

    // Extract all product IDs
    const productIds = products.map((p) => p.id)

    // Get all images for these products in a single query
    const imagesQuery = `
      SELECT * FROM product_images 
      WHERE product_id = ANY($1::int[])
      ORDER BY product_id, is_primary DESC
    `
    const imagesResult = await query(imagesQuery, [productIds])

    // Get all sizes for these products in a single query
    const sizesQuery = `
      SELECT * FROM product_sizes
      WHERE product_id = ANY($1::int[])
      ORDER BY product_id
    `
    const sizesResult = await query(sizesQuery, [productIds])

    // Create a map for quick lookup
    const imagesMap = new Map()
    imagesResult.rows.forEach((img) => {
      if (!imagesMap.has(img.product_id)) {
        imagesMap.set(img.product_id, [])
      }
      imagesMap.get(img.product_id).push(img)
    })

    const sizesMap = new Map()
    sizesResult.rows.forEach((size) => {
      if (!sizesMap.has(size.product_id)) {
        sizesMap.set(size.product_id, [])
      }
      sizesMap.get(size.product_id).push(size)
    })

    // Combine everything into the final result
    const productsWithDetails: ProductWithDetails[] = products.map((product) => ({
      ...product,
      images: imagesMap.get(product.id) || [],
      sizes: sizesMap.get(product.id) || [],
    }))

    return productsWithDetails
  } catch (error) {
    console.error("Error getting paginated products:", error)
    throw error
  }
}

// Keep the countProducts function as is
export const countProducts = async (category_id?: number): Promise<number> => {
  try {
    let queryText = "SELECT COUNT(*) as total FROM products"
    const queryParams: any[] = []

    if (category_id) {
      queryText += " WHERE category_id = $1"
      queryParams.push(category_id)
    }

    const result = await query(queryText, queryParams)
    const total = Number.parseInt(result.rows[0].total, 10)
    console.log(`Total product count: ${total}${category_id ? ` for category ${category_id}` : ""}`)
    return total
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

// Modify createProduct to calculate total stock from sizes
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

    // Calculate total stock from sizes
    let totalStock = 0
    if (sizes && sizes.length > 0) {
      totalStock = sizes.reduce((sum, size) => sum + (size.stock_quantity || 0), 0)
    }

    // Insert the product with calculated stock
    const productResult = await query(
      "INSERT INTO products (name, description, price, category_id, stock_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [
        productData.name,
        productData.description || null,
        productData.price,
        productData.category_id || null,
        totalStock, // Use calculated total
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

// Modify updateProduct to not allow direct stock_quantity updates
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

    // Note: We don't update stock_quantity directly anymore
    // It's calculated from sizes

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

// Modify updateProductSize to update total stock
export const updateProductSize = async (
  product_id: number,
  size: string,
  stock_quantity: number,
): Promise<ProductSize> => {
  try {
    // Start transaction
    await query("BEGIN")

    try {
      // Check if the size already exists for this product
      const existingSize = await query("SELECT * FROM product_sizes WHERE product_id = $1 AND size = $2", [
        product_id,
        size,
      ])

      let result

      if (existingSize.rows.length > 0) {
        // Update existing size
        result = await query(
          "UPDATE product_sizes SET stock_quantity = $1 WHERE product_id = $2 AND size = $3 RETURNING *",
          [stock_quantity, product_id, size],
        )
      } else {
        // Insert new size
        result = await query(
          "INSERT INTO product_sizes (product_id, size, stock_quantity) VALUES ($1, $2, $3) RETURNING *",
          [product_id, size, stock_quantity],
        )
      }

      // Update the product's total stock
      await updateProductTotalStock(product_id)

      // Commit transaction
      await query("COMMIT")

      return result.rows[0]
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error updating product size:", error)
    throw error
  }
}

// Modify deleteProductSize to update total stock
export const deleteProductSize = async (id: number): Promise<boolean> => {
  try {
    // Start a transaction
    await query("BEGIN")

    try {
      // Get the product size info before deletion
      const sizeInfo = await query("SELECT product_id, size FROM product_sizes WHERE id = $1", [id])

      if (sizeInfo.rows.length === 0) {
        await query("ROLLBACK")
        return false
      }

      const productId = sizeInfo.rows[0].product_id

      // Now delete the size
      const result = await query("DELETE FROM product_sizes WHERE id = $1 RETURNING id", [id])

      // Update the product's total stock
      await updateProductTotalStock(productId)

      // Commit the transaction
      await query("COMMIT")

      return result.rows.length > 0
    } catch (error) {
      // Rollback in case of error
      await query("ROLLBACK")
      throw error
    }
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

// Modify addProductSize to update total stock
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

    // Start transaction
    await query("BEGIN")

    try {
      // Insert new size
      const result = await query(
        "INSERT INTO product_sizes (product_id, size, stock_quantity) VALUES ($1, $2, $3) RETURNING *",
        [product_id, size, stock_quantity],
      )

      // Update the product's total stock
      await updateProductTotalStock(product_id)

      // Commit transaction
      await query("COMMIT")

      return result.rows[0]
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
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
