import type { NextApiRequest, NextApiResponse } from "next"
import {
  getAllProducts,
  getAllProductsWithoutPagination,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImage,
  countProducts,
  deleteProductImage,
  updateProductSize,
  deleteProductSize,
  setProductImageAsPrimary,
  addProductImageByUrl,
  searchProductsByQuery,
  addProductSize as addNewProductSize,
} from "../models/product"
import { ensureImageDimensions } from "../utils/image-utils"
import { getAllCategories } from "../models/category"
import formidable from "formidable"
import fs from "fs"
import path from "path"
// Config for file upload endpoints to disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

export const getProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { limit = "10", offset = "0", category_id, sort = "id", order = "asc", page = "1", all = "" } = req.query

    // If the "all" parameter is provided, get all products without pagination
    if (all === "true") {
      const products = await getAllProductsWithoutPagination(
        category_id ? Number.parseInt(category_id as string) : undefined,
        sort as string,
        order as string,
      )

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

    const products = await getAllProducts(
      limitNum,
      calculatedOffset,
      category_id ? Number.parseInt(category_id as string) : undefined,
      sort as string,
      order as string,
    )

    // Get total count for pagination
    const totalCount = await countProducts(category_id ? Number.parseInt(category_id as string) : undefined)
    const totalPages = Math.ceil(totalCount / limitNum)

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
  export const createNewProduct = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { name, description, price, category_id, stock_quantity, sizes, images } = req.body
  
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
  
      const product = await createProduct(
        { name, description, price, category_id, stock_quantity },
        sizes,
        processedImages,
      )
  
      return res.status(201).json({ message: "Product created successfully", product })
    } catch (error) {
      console.error("Error creating product:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
  
  export const updateExistingProduct = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { id } = req.query
      const { name, description, price, category_id, stock_quantity } = req.body
  
      if (!id) {
        return res.status(400).json({ error: "Product ID is required" })
      }
  
      const product = await updateProduct(Number.parseInt(id as string), {
        name,
        description,
        price,
        category_id,
        stock_quantity,
      })
  
      if (!product) {
        return res.status(404).json({ error: "Product not found" })
      }
  
      return res.status(200).json({ message: "Product updated successfully", product })
    } catch (error) {
      console.error("Error updating product:", error)
      return res.status(500).json({ error: "Internal server error" })
    }
  }
  
  export const deleteExistingProduct = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { id } = req.query
  
      if (!id) {
        return res.status(400).json({ error: "Product ID is required" })
      }
  
      const success = await deleteProduct(Number.parseInt(id as string))
  
      if (!success) {
        return res.status(404).json({ error: "Product not found" })
      }
  
      return res.status(200).json({ message: "Product deleted successfully" })
    } catch (error) {
      console.error("Error deleting product:", error)
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
      const { id } = req.query
  
      if (!id) {
        return res.status(400).json({ error: "Image ID is required" })
      }
  
      const success = await deleteProductImage(Number.parseInt(id as string))
  
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
  
  export const setPrimary = async (req: NextApiRequest, res: NextApiResponse) => {
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
  
  // New method to handle base64 images directly
export const addMultipleImages = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { base64Images, imageUrls, isPrimary, altText } = req.body

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const productId = Number.parseInt(id as string)
    const uploadedFiles: any[] = []
    const uploadedUrls: any[] = []
    const errors: string[] = []

    // Process base64 images if provided
    if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
      for (let i = 0; i < base64Images.length; i++) {
        try {
          const image = await addProductImage(
            productId,
            base64Images[i],
            i === 0 && isPrimary, // Only first image is primary if isPrimary is true
            undefined, // width
            undefined, // height
            altText || `Image of product ${productId}`,
          )
          uploadedFiles.push(image)
        } catch (error) {
          console.error(`Error processing base64 image:`, error)
          errors.push(`Failed to process base64 image: ${error.message}`)
        }
      }
    }

    // Process image URLs if provided
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const image = await addProductImageByUrl(
            productId,
            imageUrls[i],
            i === 0 && isPrimary && uploadedFiles.length === 0, // Only first URL is primary if isPrimary is true and no files were uploaded
          )
          uploadedUrls.push(image)
        } catch (error) {
          console.error(`Error processing URL ${imageUrls[i]}:`, error)
          errors.push(`Failed to process URL: ${error.message}`)
        }
      }
    }

    return res.status(201).json({
      message: "Images uploaded successfully",
      uploadedFiles,
      uploadedUrls,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error in addMultipleImages:", error)
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
}