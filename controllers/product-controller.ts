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
} from "../models/product"
import { ensureImageDimensions, optimizeBase64Image, processImagesInChunks } from "../utils/image-utils"
import { getAllCategories } from "../models/category"
import formidable from "formidable"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"

// Config for file upload endpoints to disable body parsing
export const config = {
  api: {
    responseLimit: '10mb',
    bodyParser: false,
  },
}


// Add new force delete endpoint handler
export const forceDeleteExistingProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const productId = Number.parseInt(id as string)

    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID format" })
    }
    // Attempt to force delete the product
    const { success, message } = await deleteProduct(productId)

    if (!success) {
      return res.status(404).json({ error: message || "Failed to delete product" })
    }

    return res.status(200).json({
      message: "Product and all its references have been permanently deleted",
    })
  } catch (error) {
    console.error("Error force deleting product:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * API handler to delete a product 
 * Uses the deleteProduct function which handles regular and force delete scenarios
 */
export const deleteExistingProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" })
    }

    const productId = Number.parseInt(id as string)
    
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID format" })
    }

    // Use the deleteProduct function which handles both normal and force delete scenarios
    const { success, message } = await deleteProduct(productId)

    if (!success) {
      return res.status(404).json({ error: message || "Failed to delete product" })
    }

    return res.status(200).json({
      message: "Product deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting product:", error)
    return res.status(500).json({ 
      error: "Internal server error", 
      details: error.message || "Unknown error occurred"
    })
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
// controllers/product-controller.ts (addMultipleImages function)
import formidable from "formidable";
import fs from "fs";
import { NextApiRequest, NextApiResponse } from "next";
import { addProductImage, addProductImageByUrl } from "../services/product-service";

/**
 * Enhanced handler for processing multiple product images
 * Supports both multipart/form-data uploads and JSON payloads with base64/URLs
 */
export const addMultipleImages = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const productId = Number.parseInt(id as string);
    
    // Check if the request is multipart/form-data
    const contentType = req.headers["content-type"] || "";
    const isMultipart = contentType.startsWith("multipart/form-data");

    if (isMultipart) {
      // Handle file uploads using formidable with optimized settings
      const form = formidable({
        maxFileSize: 50 * 1024 * 1024, // 50MB limit
        multiples: true,
        keepExtensions: true,
        maxFiles: 30, // Support up to 30 files
        uploadDir: "/tmp", // Use system temp dir for better performance
      });

      return new Promise<void>((resolve) => {
        form.parse(req, async (err, fields, files) => {
          if (err) {
            console.error("Error parsing form:", err);
            res.status(400).json({ error: `Error parsing form data: ${err.message}` });
            return resolve();
          }

          try {
            // Process images field - could be single file or array
            const imageFiles = files.images || files.files || [];
            const fileArray = Array.isArray(imageFiles) ? imageFiles : [imageFiles];

            if (fileArray.length === 0) {
              res.status(400).json({ error: "No image files provided" });
              return resolve();
            }

            console.log(`Processing ${fileArray.length} image files for product ${productId}`);

            // Parse additional form fields
            const isPrimary = fields.isPrimary === "true" || 
              (Array.isArray(fields.isPrimary) && fields.isPrimary[0] === "true");
              
            const altText = (Array.isArray(fields.altText) ? fields.altText[0] : fields.altText as string) || 
              `Image of product ${productId}`;

            // Process image URLs if provided
            const imageUrlsField = fields.imageUrls;
            let imageUrls: string[] = [];

            if (imageUrlsField) {
              if (Array.isArray(imageUrlsField)) {
                imageUrls = imageUrlsField;
              } else if (typeof imageUrlsField === 'string') {
                try {
                  // Try parsing as JSON
                  imageUrls = JSON.parse(imageUrlsField);
                } catch {
                  // If not JSON, treat as a single URL
                  imageUrls = [imageUrlsField];
                }
              }
            }

            const uploadedFiles = [];
            const errors = [];

            // Process files in chunks of 3 at a time
            await processImagesInChunks(
              fileArray,
              async (file, index) => {
                try {
                  // Verify file is an image
                  const mimeType = file.mimetype || "";
                  if (!mimeType.startsWith("image/")) {
                    throw new Error(`File ${index + 1} is not an image`);
                  }

                  // Read file as buffer
                  const fileBuffer = fs.readFileSync(file.filepath);
                  const base64Data = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

                  // Add to database directly with base64Data
                  const image = await addProductImage(
                    productId,
                    base64Data,
                    index === 0 && isPrimary, // Only first image is primary if isPrimary is true
                    undefined, // width - will be determined later if needed
                    undefined, // height - will be determined later if needed
                    altText
                  );

                  return image;
                } catch (error) {
                  console.error(`Error processing file ${index + 1}:`, error);
                  errors.push(`Failed to process file ${index + 1}: ${error.message}`);
                  return null;
                } finally {
                  // Clean up temp file
                  try {
                    if (fs.existsSync(file.filepath)) {
                      fs.unlinkSync(file.filepath);
                    }
                  } catch (err) {
                    console.warn(`Could not delete temp file:`, err);
                  }
                }
              },
              3, // Process 3 files at a time
              (processed, total) => {
                console.log(`Processed ${processed}/${total} images`);
              }
            ).then(results => {
              uploadedFiles.push(...results.filter(r => r !== null));
            });

            // Process URLs in chunks too
            const uploadedUrls = [];
            if (imageUrls && imageUrls.length > 0) {
              await processImagesInChunks(
                imageUrls,
                async (url, index) => {
                  try {
                    return await addProductImageByUrl(
                      productId,
                      url,
                      uploadedFiles.length === 0 && index === 0 && isPrimary,
                      undefined,
                      undefined,
                      altText
                    );
                  } catch (error) {
                    console.error(`Error processing URL ${index + 1}:`, error);
                    errors.push(`Failed to process URL ${index + 1}: ${error.message}`);
                    return null;
                  }
                },
                5 // Process 5 URLs at a time
              ).then(results => {
                uploadedUrls.push(...results.filter(r => r !== null));
              });
            }

            // Return successful response
            res.status(200).json({
              message: "Image processing complete",
              uploadedFiles,
              uploadedUrls,
              errors: errors.length > 0 ? errors : undefined,
            });
            
            return resolve();
          } catch (error) {
            console.error("Error processing uploaded images:", error);
            if (!res.writableEnded) {
              res.status(500).json({ error: `Failed to process uploaded images: ${error.message}` });
            }
            return resolve();
          }
        });
      });
    } else {
      // Handle JSON payload with base64 images or URLs
      // Parse the request body manually since bodyParser is disabled
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      return new Promise<void>((resolve) => {
        req.on("end", async () => {
          try {
            // Parse the JSON body
            const jsonBody = JSON.parse(body);
            const { base64Images, imageUrls, isPrimary, altText } = jsonBody;

            // Validate input
            if (
              (!base64Images || !Array.isArray(base64Images) || base64Images.length === 0) &&
              (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0)
            ) {
              res.status(400).json({ error: "At least one image (URL or base64) is required" });
              return resolve();
            }

            const uploadedFiles = [];
            const uploadedUrls = [];
            const errors = [];

            // Process base64 images in chunks
            if (base64Images && Array.isArray(base64Images) && base64Images.length > 0) {
              console.log(`Processing ${base64Images.length} base64 images for product ${productId}`);

              await processImagesInChunks(
                base64Images,
                async (base64Data, index) => {
                  try {
                    // Skip optimization to improve performance
                    return await addProductImage(
                      productId,
                      base64Data,
                      index === 0 && isPrimary,
                      undefined,
                      undefined,
                      altText || `Image of product ${productId}`
                    );
                  } catch (error) {
                    console.error(`Error processing base64 image ${index + 1}:`, error);
                    errors.push(`Failed to process base64 image ${index + 1}: ${error.message}`);
                    return null;
                  }
                },
                4 // Process 4 base64 images at a time
              ).then(results => {
                uploadedFiles.push(...results.filter(r => r !== null));
              });
            }

            // Process image URLs in chunks
            if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
              console.log(`Processing ${imageUrls.length} image URLs for product ${productId}`);

              await processImagesInChunks(
                imageUrls,
                async (url, index) => {
                  try {
                    return await addProductImageByUrl(
                      productId,
                      url,
                      uploadedFiles.length === 0 && index === 0 && isPrimary,
                      undefined,
                      undefined,
                      altText || `Image of product ${productId}`
                    );
                  } catch (error) {
                    console.error(`Error processing URL ${index + 1}:`, error);
                    errors.push(`Failed to process URL ${index + 1}: ${error.message}`);
                    return null;
                  }
                },
                5 // Process 5 URLs at a time
              ).then(results => {
                uploadedUrls.push(...results.filter(r => r !== null));
              });
            }

            if (!res.writableEnded) {
              res.status(200).json({
                message: "Image processing complete",
                uploadedFiles,
                uploadedUrls,
                errors: errors.length > 0 ? errors : undefined,
              });
            }
            
            return resolve();
          } catch (error) {
            console.error("Error parsing JSON body:", error);
            if (!res.writableEnded) {
              res.status(400).json({ error: `Invalid JSON body: ${error.message}` });
            }
            return resolve();
          }
        });
      });
    }
  } catch (error) {
    console.error("Error in addMultipleImages:", error);
    if (!res.writableEnded) {
      res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
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
