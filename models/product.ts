import { query } from "../database/connection"
import type { ProductInput, ProductSize, ProductImage, ProductWithDetails } from "@/types"
import { uploadBase64, uploadBuffer, deleteObject, getPublicObjectUrl } from "../services/backup"

/**
 * Delete a product with a safe approach first, then force delete if needed
 * @param id Product ID to delete
 * @returns Object with success status and optional message
 */
export const deleteProduct = async (id: number | string): Promise<{ success: boolean; message?: string }> => {
  try {
    // Try normal delete first
    const result = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id])

    // If normal delete succeeded, return success
    if (result.rows.length > 0) {
      return { success: true }
    }

    // If normal delete didn't work, try force delete
    console.log(`Regular delete failed for product ${id}, attempting force delete...`)
    return await forceDeleteProduct(id)
  } catch (error) {
    console.error("Error in deleteProduct:", error)
    //@ts-ignore
    // Check if this is a foreign key constraint error
    if (error.code === "23503") {
      console.log("Foreign key constraint violation detected, attempting force delete")
      return await forceDeleteProduct(id)
    }
    //@ts-ignore
    return { success: false, message: error.message || "Unknown error occurred" }
  }
}

/**
 * Force delete a product by removing all references first, with improved error handling
 * @param id Product ID to force delete
 * @returns Object with success status and optional message
 */
export const forceDeleteProduct = async (id: number | string): Promise<{ success: boolean; message?: string }> => {
  let client = null

  try {
    // Get a client for transaction
    client = await query("BEGIN")

    try {
      console.log(`Starting force delete for product ${id}...`)

      // Get product images to delete from S3 later
      const imagesResult = await query("SELECT * FROM product_images WHERE product_id = $1", [id])
      const imagesToDelete = imagesResult.rows || []

      // 1. Delete from order_items first - handle case where no rows exist
      const orderItemsResult = await query("DELETE FROM order_items WHERE product_id = $1", [id])
      console.log(`Deleted ${orderItemsResult.rowCount || 0} order_items references`)

      // 2. Delete from cart_items - handle case where no rows exist
      const cartItemsResult = await query("DELETE FROM cart_items WHERE product_id = $1", [id])
      console.log(`Deleted ${cartItemsResult.rowCount || 0} cart_items references`)

      // 3. Delete product images - handle case where no rows exist
      await query("DELETE FROM product_images WHERE product_id = $1", [id])
      console.log(`Deleted ${imagesResult.rowCount || 0} product images from database`)

      // 4. Delete product sizes - handle case where no rows exist
      const sizesResult = await query("DELETE FROM product_sizes WHERE product_id = $1", [id])
      console.log(`Deleted ${sizesResult.rowCount || 0} product sizes`)

      // 5. Finally delete the product itself
      const productResult = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id])

      if (productResult.rows.length === 0) {
        await query("ROLLBACK")
        console.log(`Product with ID ${id} not found in the products table, rollback performed`)
        return { success: false, message: "Product not found" }
      }

      console.log(`Successfully deleted product ${id} from database`)

      // Commit the transaction
      await query("COMMIT")

      // After successful database deletion, delete images from S3
      try {
        // Delete each image from S3
        for (const image of imagesToDelete) {
          if (image.s3_key) {
            await deleteObject(image.s3_key)
            console.log(`Deleted image from S3: ${image.s3_key}`)
          }
        }
      } catch (s3Error) {
        // Log but don't fail the operation if S3 deletion fails
        console.error("Error deleting images from S3:", s3Error)
      }

      return { success: true }
    } catch (error) {
      // Rollback the transaction in case of error
      await query("ROLLBACK")
      console.error("Error force deleting product:", error)
      return { success: false, message: error.message || "Error during force delete operation" }
    }
  } catch (error) {
    // If we couldn't even begin the transaction
    console.error("Error starting force delete transaction:", error)
    return { success: false, message: error.message || "Couldn't start delete transaction" }
  }
}

/**
 * Calculate total stock from product sizes
 * @param productId Product ID to calculate stock for
 * @returns Total stock quantity
 */
export const calculateTotalStock = async (productId: number): Promise<number> => {
  try {
    const result = await query(
      "SELECT COALESCE(SUM(stock_quantity), 0) as total FROM product_sizes WHERE product_id = $1",
      [productId],
    )

    return Number.parseInt(result.rows[0].total || "0", 10)
  } catch (error) {
    console.error("Error calculating total stock:", error)
    return 0
  }
}

/**
 * Update the product's total stock based on its sizes
 * @param productId Product ID to update stock for
 * @returns Success status
 */
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

/**
 * Get all products without pagination
 * @param category_id Optional category filter
 * @param sort Sort field
 * @param order Sort direction
 * @returns Array of products with details
 */
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

    // Process images to use direct public URLs if they have S3 keys
    const processedImages = imagesResult.rows.map((img) => {
      // If the image uses S3 storage, use the public URL
      if (img.s3_key) {
        img.image_url = getPublicObjectUrl(img.s3_key)
      }
      return img
    })

    // Organize images by product
    processedImages.forEach((img) => {
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

/**
 * Get paginated products
 * @param limit Maximum number of products to return
 * @param offset Pagination offset
 * @param category_id Optional category filter
 * @returns Array of products with details
 */
export const getAllProducts = async (limit = 50, offset = 0, category_id?: number): Promise<ProductWithDetails[]> => {
  try {
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

    queryText += ` ORDER BY p.created_at DESC LIMIT $${paramCounter++} OFFSET $${paramCounter++}`
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
/**
 * Count products with optional category filter
 * @param category_id Optional category filter
 * @returns Total count of products
 */
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
  
/**
 * Create a new product with optional sizes and images
 * @param productData Basic product information
 * @param sizes Optional product sizes
 * @param images Optional product images
 * @returns Created product with details
 */
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
  let client = null

  try {
    // Start a transaction
    client = await query("BEGIN")

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
        // Check if the image is a base64 string
        if (image.image_url && image.image_url.startsWith("data:")) {
          try {
            // Upload to S3 instead of storing base64 in database
            const { key, url } = await uploadBase64(image.image_url, `product_${product.id}_image`, {
              productId: product.id.toString(),
              altText: image.alt_text || "",
            })

            // Store the S3 key and URL in the database
            await query(
              "INSERT INTO product_images (product_id, image_url, s3_key, is_primary, width, height, alt_text) VALUES ($1, $2, $3, $4, $5, $6, $7)",
              [
                product.id,
                url, // Store the URL for backward compatibility
                key, // Store the S3 key for future reference
                image.is_primary || false,
                image.width || null,
                image.height || null,
                image.alt_text || null,
              ],
            )
          } catch (error) {
            console.error("Error uploading image to S3:", error)
            // Fall back to storing base64 in database if S3 upload fails
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
        } else {
          // For non-base64 URLs, just store the URL
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
    }

    // Commit the transaction
    await query("COMMIT")

    // Return the product with details
    return getProductById(product.id) as Promise<ProductWithDetails>
  } catch (error) {
    // Rollback the transaction in case of error
    if (client) {
      await query("ROLLBACK")
    }
    console.error("Error creating product:", error)
    throw error
  }
}

/**
 * Update product information
 * @param id Product ID to update
 * @param productData Updated product data
 * @returns Updated product with details or null if not found
 */
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

/**
 * Add a new image to a product
 * @param product_id Product ID
 * @param image_url URL or base64 of the image
 * @param is_primary Whether this is the primary image
 * @param width Optional width
 * @param height Optional height
 * @param alt_text Optional alt text
 * @returns Created image
 */
export const addProductImage = async (
  productId: number,
  imageUrl: string,
  isPrimary = false,
  width?: number,
  height?: number,
  altText?: string,
  s3Key?: string,
): Promise<any> => {
  try {
    // Validate the product exists
    const product = await getProductById(productId)
    if (!product) {
      throw new Error(`Product with ID ${productId} not found`)
    }

    // If this is the first image or marked as primary, set all other images as non-primary
    if (isPrimary) {
      await query(`UPDATE product_images SET is_primary = false WHERE product_id = $1`, [productId])
    }

    // Insert the new image
    const result = await query(
      `INSERT INTO product_images (product_id, image_url, is_primary, width, height, alt_text, s3_key) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [productId, imageUrl, isPrimary, width || null, height || null, altText || null, s3Key || null],
    )

    // Get the inserted image
    const imagesResult = await query(`SELECT * FROM product_images WHERE id = $1`, [result.rows[0].id])

    // If the image has an S3 key, use the public URL
    const image = imagesResult.rows[0]
    if (image.s3_key) {
      image.image_url = getPublicObjectUrl(image.s3_key)
    }

    return image
  } catch (error) {
    console.error(`Error adding image to product ${productId}:`, error)
    throw error
  }
}

/**
 * Delete a product image
 * @param id Image ID to delete
 * @returns Success status
 */
export const deleteProductImage = async (id: number): Promise<boolean> => {
  try {
    // First, get the image to check if it has an S3 key
    const imageResult = await query("SELECT * FROM product_images WHERE id = $1", [id])

    if (imageResult.rows.length === 0) {
      return false
    }

    const image = imageResult.rows[0]

    // Delete from database
    const result = await query("DELETE FROM product_images WHERE id = $1 RETURNING id", [id])

    if (result.rows.length === 0) {
      return false
    }

    // If the image was stored in S3, delete it from there too
    if (image.s3_key) {
      try {
        await deleteObject(image.s3_key)
        console.log(`Deleted image from S3: ${image.s3_key}`)
      } catch (s3Error) {
        // Log but don't fail the operation if S3 deletion fails
        console.error(`Error deleting image from S3: ${image.s3_key}`, s3Error)
      }
    }

    return true
  } catch (error) {
    console.error("Error deleting product image:", error)
    throw error
  }
}

/**
 * Update a product size or create if it doesn't exist
 * @param product_id Product ID
 * @param size Size name/code
 * @param stock_quantity Stock quantity for this size
 * @returns Updated or created size
 */
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

    let result

    // Start transaction outside of nested try/catch
    await query("BEGIN")

    try {
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

/**
 * Delete a product size
 * @param id Size ID to delete
 * @returns Success status
 */
export const deleteProductSize = async (id: number): Promise<boolean> => {
  try {
    // Start a transaction
    await query("BEGIN")

    try {
      // Get the product size info before deletion
      const sizeInfo = await query("SELECT product_id FROM product_sizes WHERE id = $1", [id])

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

/**
 * Set a product image as the primary image
 * @param productId Product ID
 * @param imageId Image ID to set as primary
 * @returns Success status
 */
export const setProductImageAsPrimary = async (productId: number, imageId: number): Promise<boolean> => {
  try {
    // Start a transaction
    await query("BEGIN")

    try {
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
      throw error
    }
  } catch (error) {
    console.error("Error setting product image as primary:", error)
    throw error
  }
}

/**
 * Search products by query string
 * @param searchQuery Query string to search
 * @returns Products matching the search
 */
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

    if (products.length === 0) {
      return []
    }

    // Use the bulk fetching approach for better performance
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

    // Process images to use direct public URLs if they have S3 keys
    const processedImages = imagesResult.rows.map((img) => {
      // If the image uses S3 storage, use the public URL
      if (img.s3_key) {
        img.image_url = getPublicObjectUrl(img.s3_key)
      }
      return img
    })

    // Create maps for quick lookup
    const imagesMap = new Map()
    processedImages.forEach((img) => {
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
    console.error("Error searching products:", error)
    throw error
  }
}

/**
 * Add a product size
 * @param product_id Product ID
 * @param size Size name/code
 * @param stock_quantity Stock quantity for this size
 * @returns Created size
 */
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

/**
 * Add a new product image by URL
 * @param product_id Product ID
 * @param image_url URL of the image
 * @param is_primary Whether this is the primary image
 * @param width Optional width
 * @param height Optional height
 * @param alt_text Optional alt text
 * @returns Created image
 */
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

    // For URL-based images, we'll try to download and store in S3 if possible
    try {
      // Fetch the image
      const response = await fetch(image_url)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }

      // Get the content type
      const contentType = response.headers.get("content-type") || "image/jpeg"

      // Convert to buffer
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to S3
      const { key, url } = await uploadBuffer(buffer, contentType, `product_${product_id}_image`, {
        productId: product_id.toString(),
        altText: alt_text || "",
      })

      // Store in database with S3 key
      const result = await query(
        "INSERT INTO product_images (product_id, image_url, s3_key, is_primary, width, height, alt_text) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
        [
          product_id,
          url, // Store the URL for backward compatibility
          key, // Store the S3 key for future reference
          is_primary,
          width || null,
          height || null,
          alt_text || null,
        ],
      )

      // If the image has an S3 key, use the public URL
      const image = result.rows[0]
      if (image.s3_key) {
        image.image_url = getPublicObjectUrl(image.s3_key)
      }

      return image
    } catch (error) {
      console.error("Error downloading and storing image in S3:", error)

      // Fall back to just storing the URL
      const result = await query(
        "INSERT INTO product_images (product_id, image_url, is_primary, width, height, alt_text) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [product_id, image_url, is_primary, width || null, height || null, alt_text || null],
      )

      return result.rows[0]
    }
  } catch (error) {
    console.error("Error adding product image by URL:", error)
    throw error
  }
}
