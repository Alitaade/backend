import type { NextApiRequest, NextApiResponse } from "next"
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  updateProductSize,
  deleteProductSize,
  setProductImageAsPrimary,
  addProductImageByUrl,
  searchProductsByQuery,
  getAllProductsWithoutPagination,
  countProducts,
  addProductSize as addNewProductSize,
  forceDeleteProduct,
  calculateTotalStock,
  updateProductTotalStock,
  canDeleteProduct,
} from "../models/product"
import { ensureImageDimensions, optimizeBase64Image } from "../utils/image-utils"
import { getAllCategories } from "../models/category"
import formidable from "formidable"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"

// Config for file upload endpoints to disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
}

// Safe directory creation function that works in serverless environments
const ensureDir = (dirPath: string) => {
  // Only try to create directory if we're in a writable environment
  try {
    if (process.env.NODE_ENV !== "production") {
      // In development, we can create directories as needed
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
      }
    }
    return true
  } catch (error) {
    console.warn(`Warning: Could not create directory ${dirPath}`, error)
    return false
  }
}

// Directory where uploads will be stored temporarily - use /tmp in production for Lambda compatibility
const UPLOADS_DIR =
  process.env.NODE_ENV === "production" ? path.join("/tmp", "uploads") : path.join(process.cwd(), "uploads")

// Initialize uploads directory
ensureDir(UPLOADS_DIR)

// Add new force delete endpoint handler
export const forceDeleteExistingProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const productId = Number.parseInt(id as string)

    // Attempt to force delete the product
    const { success, message } = await forceDeleteProduct(productId)

    if (!success) {
      return res.status(404).json({ error: message || "Failed to delete product" })
    }

    return res.status(200).json({
      message: "Product and all its references have been permanently deleted",
      forceDelete: true,
    })
  } catch (error) {
    console.error("Error force deleting product:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Update the deleteExistingProduct function to properly handle foreign key constraints
export const deleteExistingProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const productId = Number.parseInt(id as string)

    try {
      // First check if the product can be safely deleted
      const { canDelete, message } = await canDeleteProduct(productId)

      if (!canDelete) {
        // If it can't be deleted normally, inform the client
        return res.status(409).json({
          error: message || "Cannot delete product because it is referenced in orders",
          requiresForceDelete: true,
          productId,
        })
      }

      // If it can be deleted normally, proceed
      const success = await deleteProduct(productId)

      if (!success) {
        return res.status(404).json({ error: "Product not found" })
      }

      return res.status(200).json({ message: "Product deleted successfully" })
    } catch (error) {
      // Check for foreign key constraint violation
      if (error.code === "23503") {
        return res.status(409).json({
          error: "Cannot delete product because it is referenced in orders",
          detail: error.detail,
          requiresForceDelete: true,
          productId,
        })
      }
      throw error
    }
  } catch (error) {
    console.error("Error deleting product:", error)
    return res.status(500).json({ error: "Internal server error", details: error.message })
  }
}

// Update the createNewProduct function to handle automatic stock calculation
export const createNewProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { name, description, price, category_id, sizes, images } = req.body

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({ error: "Name and price are required" })
    }

    // Validate that images is an array if provided
    if (images && !Array.isArray(images)) {
      return res.status(400).json({ error: "Images must be an array" })
    }

    // Process images to ensure they have dimensions
    const processedImages = images
      ? images.map((img: any, index: number) => {
          const { url, width, height } = ensureImageDimensions(img.image_url || img.url, img.width, img.height)

          return {
            image_url: url,
            width,
            height,
            is_primary: index === 0 || img.is_primary,
            alt_text: img.alt_text || `Image of ${name}`,
          }
        })
      : undefined

    // Calculate total stock from sizes
    const totalStock = sizes ? sizes.reduce((sum, size) => sum + (Number.parseInt(size.stock_quantity) || 0), 0) : 0

    const product = await createProduct(
      { name, description, price, category_id, stock_quantity: totalStock },
      sizes,
      processedImages,
    )

    return res.status(201).json({ message: "Product created successfully", product })
  } catch (error) {
    console.error("Error creating product:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Update the updateExistingProduct function to handle automatic stock calculation
export const updateExistingProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { name, description, price, category_id } = req.body

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const productId = Number.parseInt(id as string)

    // Update the product without stock_quantity (it's calculated from sizes)
    const product = await updateProduct(productId, {
      name,
      description,
      price,
      category_id,
    })

    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }

    // Recalculate and update the total stock
    await updateProductTotalStock(productId)

    // Get the updated product with the new calculated stock
    const updatedProduct = await getProductById(productId)

    return res.status(200).json({ message: "Product updated successfully", product: updatedProduct })
  } catch (error) {
    console.error("Error updating product:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Add a new endpoint to get the calculated total stock
export const getProductTotalStock = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const productId = Number.parseInt(id as string)
    const totalStock = await calculateTotalStock(productId)

    return res.status(200).json({ totalStock })
  } catch (error) {
    console.error("Error getting product total stock:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// Keep other functions as they are...
export const getProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { limit = "10", offset = "0", category_id, sort = "id", order = "asc", page = "1", all = "" } = req.query

    console.log("Processing product request with params:", {
      limit,
      offset,
      category_id,
      sort,
      order,
      page,
      all,
    })

    // If the "all" parameter is provided, get all products without pagination
    if (all === "true") {
      console.log("Getting ALL products without pagination")
      const products = await getAllProductsWithoutPagination(
        category_id ? Number.parseInt(category_id as string) : undefined,
        sort as string,
        order as string,
      )

      console.log(`Returning ${products.length} products in 'all' mode`)
      return res.status(200).json({
        products,
        page: 1,
        limit: products.length,
        total: products.length,
        totalPages: 1,
      })
    }

    // Calculate offset based on page if provided
    const pageNum = Number.parseInt(page as string, 10)
    const limitNum = Number.parseInt(limit as string, 10)
    const calculatedOffset = pageNum > 1 ? (pageNum - 1) * limitNum : Number.parseInt(offset as string, 10)

    console.log("Calculated pagination values:", {
      pageNum,
      limitNum,
      calculatedOffset,
    })

    // Get total count first for pagination
    const totalCount = await countProducts(category_id ? Number.parseInt(category_id as string) : undefined)
    const totalPages = Math.ceil(totalCount / limitNum)

    // Get paginated products
    const products = await getAllProducts(
      limitNum,
      calculatedOffset,
      category_id ? Number.parseInt(category_id as string) : undefined,
      sort as string,
      order as string,
    )

    console.log(`Returning ${products.length} products (page ${pageNum} of ${totalPages}), total: ${totalCount}`)

    return res.status(200).json({
      products,
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalPages,
    })
  } catch (error) {
    console.error("Error getting products:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const getProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const product = await getProductById(Number.parseInt(id as string))

    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }

    return res.status(200).json({ product })
  } catch (error) {
    console.error("Error getting product:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const addImage = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { product_id, image_url, is_primary, width, height, alt_text } = req.body

    if (!product_id || !image_url) {
      return res.status(400).json({ error: "Product ID and image URL are required" })
    }

    // Process the image to ensure it has dimensions
    const processedImage = ensureImageDimensions(
      image_url,
      width ? Number.parseInt(width as string) : undefined,
      height ? Number.parseInt(height as string) : undefined,
    )

    const image = await addProductImage(
      Number.parseInt(product_id as string),
      processedImage.url,
      is_primary,
      processedImage.width,
      processedImage.height,
      alt_text as string,
    )

    return res.status(201).json({ message: "Image added successfully", image })
  } catch (error) {
    console.error("Error adding product image:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const deleteImage = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { imageId } = req.query

    if (!imageId) {
      return res.status(400).json({ error: "Image ID is required" })
    }

    const success = await deleteProductImage(Number.parseInt(imageId as string))

    if (!success) {
      return res.status(404).json({ error: "Image not found" })
    }

    return res.status(200).json({ message: "Image deleted successfully" })
  } catch (error) {
    console.error("Error deleting product image:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const updateSize = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { product_id, size, stock_quantity } = req.body

    if (!product_id || !size || stock_quantity === undefined) {
      return res.status(400).json({ error: "Product ID, size, and stock quantity are required" })
    }

    const productSize = await updateProductSize(
      Number.parseInt(product_id as string),
      size,
      Number.parseInt(stock_quantity as string),
    )

    return res.status(200).json({ message: "Size updated successfully", size: productSize })
  } catch (error) {
    console.error("Error updating product size:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const deleteSize = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Size ID is required" })
    }

    const success = await deleteProductSize(Number.parseInt(id as string))

    if (!success) {
      return res.status(404).json({ error: "Size not found" })
    }

    return res.status(200).json({ message: "Size deleted successfully" })
  } catch (error) {
    console.error("Error deleting product size:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const setPrimaryImage = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id: productId, imageId } = req.query

    if (!productId || !imageId) {
      return res.status(400).json({ error: "Product ID and Image ID are required" })
    }

    const success = await setProductImageAsPrimary(
      Number.parseInt(productId as string),
      Number.parseInt(imageId as string),
    )

    if (!success) {
      return res.status(404).json({ error: "Image not found or does not belong to the product" })
    }

    return res.status(200).json({ message: "Image set as primary successfully" })
  } catch (error) {
    console.error("Error setting primary image:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const addImageByUrl = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { image_url, is_primary } = req.body

    if (!id || !image_url) {
      return res.status(400).json({ error: "Product ID and image URL are required" })
    }

    const productId = Number.parseInt(id as string)

    // Process the image to ensure it has dimensions
    const processedImage = ensureImageDimensions(image_url)

    const image = await addProductImageByUrl(
      productId,
      processedImage.url,
      is_primary === true,
      processedImage.width,
      processedImage.height,
    )

    return res.status(201).json({ message: "Image added successfully", image })
  } catch (error) {
    console.error("Error adding product image by URL:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

// New function to handle file uploads
export const addImageFromFile = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Ensure uploads directory exists
    if (!ensureDir(UPLOADS_DIR)) {
      return res.status(500).json({ error: "Could not access upload directory" })
    }

    // Parse the form data using formidable - fixed for newer formidable versions
    const options = {
      uploadDir: UPLOADS_DIR,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    }

    const form = formidable(options)

    return new Promise<void>((resolve) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Error parsing form:", err)
          res.status(500).json({ error: "Error parsing form data" })
          return resolve()
        }

        const productId = Number.parseInt(req.query.id as string)
        if (isNaN(productId)) {
          res.status(400).json({ error: "Invalid product ID" })
          return resolve()
        }

        // Get file from files object (formidable v4 returns arrays)
        const fileArray = files.image
        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray

        if (!file) {
          res.status(400).json({ error: "No image file provided" })
          return resolve()
        }

        // Verify file is an image
        const mimeType = file.mimetype || ""
        if (!mimeType.startsWith("image/")) {
          // Clean up the file
          try {
            if (fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath)
            }
          } catch (err) {
            console.warn("Could not delete non-image file:", err)
          }
          res.status(400).json({ error: "Only image files are allowed" })
          return resolve()
        }

        try {
          const isPrimary = fields.is_primary === "true"
          const altText = fields.alt_text || `Image of product ${productId}`

          // Generate a unique filename
          const uniqueFilename = `${uuidv4()}${path.extname(file.originalFilename || "")}`

          // In production (serverless), use S3 or other storage service
          // This code assumes you're handling the public uploads differently in production
          let publicPath

          if (process.env.NODE_ENV === "production") {
            // For production, you would typically:
            // 1. Upload to S3 or similar service
            // 2. Get the public URL
            // This is a placeholder - implement your cloud storage logic here
            publicPath = `/api/images/${uniqueFilename}` // A route that serves images

            // Keep the file in /tmp for now
            // In a real implementation, you'd upload to S3 here
          } else {
            // For development, save to local public directory
            publicPath = `/uploads/${uniqueFilename}`
            const destinationPath = path.join(process.cwd(), "public", "uploads", uniqueFilename)

            // Ensure public uploads directory exists
            const uploadDir = path.dirname(destinationPath)
            ensureDir(uploadDir)

            // Move the file from temp location to public directory
            fs.copyFileSync(file.filepath, destinationPath)
          }

          // Clean up the temp file
          try {
            if (fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath)
            }
          } catch (err) {
            console.warn("Could not delete temp file:", err)
          }

          // Process the image dimensions
          const processedImage = ensureImageDimensions(
            publicPath,
            fields.width ? Number.parseInt(fields.width as string) : undefined,
            fields.height ? Number.parseInt(fields.height as string) : undefined,
          )

          // Save to database
          const image = await addProductImage(
            productId,
            publicPath,
            isPrimary,
            processedImage.width,
            processedImage.height,
            altText as string,
          )

          res.status(201).json({
            message: "Image uploaded successfully",
            image,
          })
        } catch (error) {
          console.error("Error processing uploaded image:", error)
          // Clean up the temp file if exists
          try {
            if (file && file.filepath && fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath)
            }
          } catch (err) {
            console.warn("Could not delete temp file during error cleanup:", err)
          }
          res.status(500).json({ error: "Failed to process uploaded image" })
        }

        return resolve()
      })
    })
  } catch (error) {
    console.error("Error in file upload:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const searchProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { q } = req.query

    if (!q) {
      return res.status(400).json({ error: "Search query is required" })
    }

    const products = await searchProductsByQuery(q as string)

    return res.status(200).json({ products })
  } catch (error) {
    console.error("Error searching products:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const getCategories = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const categories = await getAllCategories()

    return res.status(200).json({ categories })
  } catch (error) {
    console.error("Error getting categories:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const addSize = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { size, stock_quantity } = req.body

    if (!id || !size || stock_quantity === undefined) {
      return res.status(400).json({ error: "Product ID, size, and stock quantity are required" })
    }

    const productSize = await addNewProductSize(
      Number.parseInt(id as string),
      size,
      Number.parseInt(stock_quantity as string),
    )

    return res.status(201).json({ message: "Size added successfully", size: productSize })
  } catch (error) {
    // Handle specific error for duplicate size
    if (error instanceof Error && error.message === "Size already exists for this product") {
      return res.status(400).json({ error: error.message })
    }

    console.error("Error adding product size:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
// Improved method to handle multiple images with better error handling and logging
export const addMultipleImages = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const productId = Number.parseInt(id as string)

    // Check if the request is multipart/form-data
    const contentType = req.headers["content-type"] || ""
    const isMultipart = contentType.startsWith("multipart/form-data")

    if (isMultipart) {
      // Handle file uploads using formidable
      const form = formidable({
        maxFileSize: 20 * 1024 * 1024, // 20MB limit
        multiples: true,
        keepExtensions: true,
      })

      return new Promise<void>((resolve) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error("Error parsing form:", err)
            res.status(400).json({ error: `Error parsing form data: ${err.message}` })
            return resolve()
          }

          try {
            console.log("Received form data:", {
              fieldKeys: Object.keys(fields),
              fileKeys: Object.keys(files),
              filesCount: files.images ? (Array.isArray(files.images) ? files.images.length : 1) : 0,
            })

            // Get files from the 'images' field (formidable returns an array)
            const imageFiles = files.images || []
            const fileArray = Array.isArray(imageFiles) ? imageFiles : [imageFiles]

            if (fileArray.length === 0) {
              res.status(400).json({ error: "No image files provided" })
              return resolve()
            }

            console.log(`Processing ${fileArray.length} image files for product ${productId}`)

            // Process image URLs if provided
            const imageUrlsField = fields.imageUrls
            let imageUrls: string[] = []

            if (imageUrlsField) {
              try {
                // Parse the JSON string
                imageUrls = JSON.parse(Array.isArray(imageUrlsField) ? imageUrlsField[0] : imageUrlsField)
              } catch (e) {
                console.warn("Could not parse imageUrls JSON:", e)
              }
            }

            const isPrimary =
              fields.isPrimary === "true" || (Array.isArray(fields.isPrimary) && fields.isPrimary[0] === "true")
            const altText =
              (Array.isArray(fields.altText) ? fields.altText[0] : (fields.altText as string)) ||
              `Image of product ${productId}`

            const uploadedFiles = []
            const errors = []

            // Process each file - convert to high-quality base64
            for (let i = 0; i < fileArray.length; i++) {
              const file = fileArray[i]

              // Verify file is an image
              const mimeType = file.mimetype || ""
              if (!mimeType.startsWith("image/")) {
                errors.push(`File ${i + 1} is not an image`)
                continue
              }

              try {
                // Read file as buffer
                const fileBuffer = require("fs").readFileSync(file.filepath)

                // Convert to base64 with high quality
                const base64Data = `data:${mimeType};base64,${fileBuffer.toString("base64")}`

                // Optimize the image while maintaining high quality
                const optimizedBase64 = await optimizeBase64Image(base64Data, {
                  quality: 100, // High quality
                  format: mimeType.includes("png") ? "png" : "jpeg",
                })

                // Add to database directly as base64
                const image = await addProductImage(
                  productId,
                  optimizedBase64,
                  i === 0 && isPrimary, // Only first image is primary if isPrimary is true
                  undefined, // width
                  undefined, // height,
                  altText,
                )

                uploadedFiles.push(image)
              } catch (error) {
                console.error(`Error processing file ${i + 1}:`, error)
                errors.push(`Failed to process file ${i + 1}: ${error.message}`)
              } finally {
                // Clean up temp file
                try {
                  if (require("fs").existsSync(file.filepath)) {
                    require("fs").unlinkSync(file.filepath)
                  }
                } catch (err) {
                  console.warn(`Could not delete temp file for image ${i + 1}:`, err)
                }
              }
            }

            // Process image URLs if provided
            const uploadedUrls = []
            if (imageUrls && imageUrls.length > 0) {
              for (let i = 0; i < imageUrls.length; i++) {
                try {
                  const image = await addProductImageByUrl(
                    productId,
                    imageUrls[i],
                    uploadedFiles.length === 0 && i === 0 && isPrimary, // Primary if first URL and no files uploaded
                  )
                  uploadedUrls.push(image)
                } catch (error) {
                  console.error(`Error processing URL ${i + 1}:`, error)
                  errors.push(`Failed to process URL ${i + 1}: ${error.message}`)
                }
              }
            }

            res.status(200).json({
              message: "Image processing complete",
              uploadedFiles,
              uploadedUrls,
              errors: errors.length > 0 ? errors : undefined,
            })
          } catch (error) {
            console.error("Error processing uploaded images:", error)
            res.status(500).json({ error: `Failed to process uploaded images: ${error.message}` })
          }

          return resolve()
        })
      })
    } else {
      // Handle JSON payload with base64 images or URLs
      // Parse the request body manually since bodyParser is disabled
      let body = ""

      req.on("data", (chunk) => {
        body += chunk.toString()
      })

      return new Promise<void>((resolve) => {
        req.on("end", async () => {
          try {
            // Parse the JSON body
            const jsonBody = JSON.parse(body)
            const { base64Images, imageUrls, isPrimary, altText } = jsonBody

            console.log("Received JSON payload:", {
              hasBase64: Array.isArray(base64Images) && base64Images.length > 0,
              hasUrls: Array.isArray(imageUrls) && imageUrls.length > 0,
              isPrimary,
            })

            // Validate input
            if (
              (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) &&
              (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0)
            ) {
              res.status(400).json({ error: "At least one image (URL or base64) is required" })
              return resolve()
            }

            const uploadedFiles = []
            const uploadedUrls = []
            const errors = []

            // Process base64 images
            if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
              console.log(`Processing ${base64Images.length} base64 images for product ${productId}`)

              for (let i = 0; i < base64Images.length; i++) {
                try {
                  // Optimize the base64 image while maintaining high quality
                  const optimizedBase64 = await optimizeBase64Image(base64Images[i], {
                    quality: 95, // High quality
                  })

                  const image = await addProductImage(
                    productId,
                    optimizedBase64,
                    i === 0 && isPrimary, // Only first image is primary if isPrimary is true
                    undefined, // width
                    undefined, // height
                    altText || `Image of product ${productId}`,
                  )

                  uploadedFiles.push(image)
                } catch (error) {
                  console.error(`Error processing base64 image ${i + 1}:`, error)
                  errors.push(`Failed to process base64 image ${i + 1}: ${error.message}`)
                }
              }
            }

            // Process image URLs
            if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
              console.log(`Processing ${imageUrls.length} image URLs for product ${productId}`)

              for (let i = 0; i < imageUrls.length; i++) {
                try {
                  const image = await addProductImageByUrl(
                    productId,
                    imageUrls[i],
                    uploadedFiles.length === 0 && i === 0 && isPrimary, // Primary if first URL and no files uploaded
                  )

                  uploadedUrls.push(image)
                } catch (error) {
                  console.error(`Error processing URL ${i + 1}:`, error)
                  errors.push(`Failed to process URL ${i + 1}: ${error.message}`)
                }
              }
            }

            res.status(200).json({
              message: "Image processing complete",
              uploadedFiles,
              uploadedUrls,
              errors: errors.length > 0 ? errors : undefined,
            })
          } catch (error) {
            console.error("Error parsing JSON body:", error)
            res.status(400).json({ error: `Invalid JSON body: ${error.message}` })
          }
          return resolve()
        })
      })
    }
  } catch (error) {
    console.error("Error in addMultipleImages:", error)
    return res.status(500).json({ error: `Internal server error: ${error.message}` })
  }
}
// Export all functions for use in API routes
export {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  updateProductSize,
  deleteProductSize,
  setProductImageAsPrimary,
  addProductImageByUrl,
  searchProductsByQuery,
  addNewProductSize,
  forceDeleteProduct,
  calculateTotalStock,
  updateProductTotalStock,
}
