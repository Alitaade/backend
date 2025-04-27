import type { NextApiRequest, NextApiResponse } from "next"
import { query } from "../../../database/connection"
import { createNewProduct, getProducts } from "../../../controllers/product-controller"
import { requireAdmin } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {


  try {
     // Normalize query parameters - map 'category' to 'category_id' if it exists
     if (req.query.category && !req.query.category_id) {
      req.query.category_id = req.query.category;
    }
    switch (req.method) {
      case "GET":
        // Public endpoint - get all products
        return await getProducts(req, res)

      case "POST":
        // Admin only - create a new product
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, async () => {
            try {
              await createNewProduct(req, res)
            } catch (error) {
              console.error("Error in createNewProduct:", error)
              if (!res.writableEnded) {
                res.status(500).json({ error: "Internal server error" })
              }
            } finally {
              resolve()
            }
          })
        })

      default:
        
        res.setHeader("Allow", ["GET", "POST", "OPTIONS"])
        return res.status(405).json({ error: "Method not allowed" })
    }
  } catch (error) {
    console.error("Unhandled error in products handler:", error)
  
  }
}

async function getProductsHandler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract query parameters
    const { search, category_id, is_featured, is_active, min_price, max_price, page = 1, limit = 10 } = req.query

    // Build the SQL query
    let sqlQuery = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `
    const queryParams: any[] = []
    let paramIndex = 1

    // Add search filter
    if (search) {
      sqlQuery += ` AND (
        p.name ILIKE $${paramIndex} OR
        p.description ILIKE $${paramIndex}
      )`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    // Add category filter
    if (category_id) {
      sqlQuery += ` AND p.category_id = $${paramIndex}`
      queryParams.push(Number(category_id))
      paramIndex++
    }

    // Add featured filter
    if (is_featured !== undefined) {
      sqlQuery += ` AND p.is_featured = $${paramIndex}`
      queryParams.push(is_featured === "true")
      paramIndex++
    }

    // Add active filter
    if (is_active !== undefined) {
      sqlQuery += ` AND p.is_active = $${paramIndex}`
      queryParams.push(is_active === "true")
      paramIndex++
    }

    // Add price range filters
    if (min_price) {
      sqlQuery += ` AND p.base_price >= $${paramIndex}`
      queryParams.push(Number(min_price))
      paramIndex++
    }

    if (max_price) {
      sqlQuery += ` AND p.base_price <= $${paramIndex}`
      queryParams.push(Number(max_price))
      paramIndex++
    }

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (${sqlQuery}) as filtered_products
    `
    const countResult = await query(countQuery, queryParams)
    const total = Number.parseInt(countResult.rows[0].total)

    // Add pagination
    const offset = (Number(page) - 1) * Number(limit)
    sqlQuery += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(Number(limit), offset)

    // Execute the query
    const result = await query(sqlQuery, queryParams)

    // Get product images
    const productIds = result.rows.map((product) => product.id)

    if (productIds.length > 0) {
      const imagesQuery = `
        SELECT * FROM product_images 
        WHERE product_id = ANY($1)
        ORDER BY is_primary DESC
      `
      const imagesResult = await query(imagesQuery, [productIds])

      // Group images by product_id
      const imagesByProduct = imagesResult.rows.reduce((acc, img) => {
        if (!acc[img.product_id]) {
          acc[img.product_id] = []
        }
        acc[img.product_id].push(img)
        return acc
      }, {})

      // Add images to products
      result.rows.forEach((product) => {
        product.images = imagesByProduct[product.id] || []
        product.category = { id: product.category_id, name: product.category_name }
        delete product.category_name
      })
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / Number(limit))

    

    // Return paginated response
    return res.status(200).json({
      data: result.rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages,
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    
    return res.status(500).json({ error: "Internal server error" })
  }
}
