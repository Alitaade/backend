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
import { ensureImageDimensions, processImagesInBatches } from "../utils/image-utils"
import { getAllCategories } from "../models/category"
import formidable from "formidable";
import fs from "fs";
const formidableConfig = {
  keepExtensions: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB limit per file
  maxFields: 10,
  multiples: true,
};

export const config = {
  api: {
    bodyParser: false,
  },
};


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

/**
 * Enhanced handler for processing multiple product images
 * Supports both multipart/form-data uploads and JSON payloads with base64/URLs
 */


// Helper to read request body as string (for JSON requests)
const readBody = (req: NextApiRequest): Promise<string> => {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      resolve(body);
    });
  });
};

// Process FormData uploads (binary file uploads)
export const handleFormDataUpload = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const startTime = Date.now();
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Product ID is required" });
    const productId = Number.parseInt(id as string);

    // Disable Next.js body parsing for form data
    const form = formidable(formidableConfig);
    
    // Parse the form
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    // Handle isPrimary and altText from form fields
    const isPrimary = fields.isPrimary?.[0] === "true";
    const defaultAltText = fields.altText?.[0] || `Product ${productId}`;
    
    // Process files
    const uploadedFiles = [];
    const errors = [];
    
    // Convert files object to array if it exists
    const fileArray = files.file ? (Array.isArray(files.file) ? files.file : [files.file]) : [];
    
    if (fileArray.length > 0) {
      // Process files in batches for better performance
      const results = await processImagesInBatches(
        fileArray,
        async (file, index) => {
          try {
            // Read file data
            const fileData = await fs.promises.readFile(file.filepath);
            
            // Add the image to product
            const image = await addProductImage(
              productId, 
              fileData.toString("base64"),
              index === 0 && isPrimary,
              undefined,
              undefined,
              defaultAltText || `Product ${productId} image ${index + 1}`
            );
            
            // Clean up temp file
            await fs.promises.unlink(file.filepath);
            
            return { image };
          } catch (error) {
            console.error(`File upload error for ${file.originalFilename}:`, error.message);
            return { error: `Error with file ${file.originalFilename}: ${error.message}` };
          }
        },
        3 // Process 3 files concurrently
      );
      
      // Process results
      results.forEach(result => {
        if (result.image) uploadedFiles.push(result.image);
        if (result.error) errors.push(result.error);
      });
    }
    
    // Log processing time
    const processingTime = Date.now() - startTime;
    console.log(`FormData files processed in ${processingTime}ms: ${uploadedFiles.length} successful, ${errors.length} failed`);
    
    return res.status(200).json({
      message: "Files processed",
      processingTimeMs: processingTime,
      uploadedFile: uploadedFiles[0], // For single file endpoint
      uploadedFiles: uploadedFiles,   // For multiple files endpoint
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Server error in handleFormDataUpload:", error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

// Process JSON uploads (for base64 images and URLs)
export const handleJsonUpload = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const startTime = Date.now();
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Product ID is required" });
    const productId = Number.parseInt(id as string);
    
    // Parse the JSON payload
    const body = await readBody(req);
    const jsonBody = JSON.parse(body);
    const { base64Images, imageUrls, isPrimary, altText } = jsonBody;
    
    // Quick validation
    if ((!base64Images || base64Images.length === 0) && (!imageUrls || imageUrls.length === 0)) {
      return res.status(400).json({ error: "No images provided" });
    }

    // Apply limits to prevent overloading
    const MAX_BASE64 = 10;
    const MAX_URLS = 15;
    const limitedBase64 = Array.isArray(base64Images) ? base64Images.slice(0, MAX_BASE64) : [];
    const limitedUrls = Array.isArray(imageUrls) ? imageUrls.slice(0, MAX_URLS) : [];
    
    const defaultAltText = altText || `Product ${productId}`;
    
    // Process in parallel with optimized chunk sizes for better performance
    const [base64Results, urlResults] = await Promise.all([
      limitedBase64.length > 0 
        ? processImagesInBatches(
            limitedBase64,
            async (base64Data, index) => {
              try {
                const image = await addProductImage(
                  productId,
                  base64Data,
                  index === 0 && isPrimary,
                  undefined,
                  undefined,
                  defaultAltText
                );
                return { image };
              } catch (error) {
                console.error(`Base64 image ${index + 1} error:`, error.message);
                return { error: `Error with base64 image ${index + 1}: ${error.message}` };
              }
            },
            4 // Process 4 base64 images concurrently
          )
        : Promise.resolve([]),
        
      limitedUrls.length > 0
        ? processImagesInBatches(
            limitedUrls,
            async (url, index) => {
              try {
                const image = await addProductImageByUrl(
                  productId,
                  url,
                  (!limitedBase64 || limitedBase64.length === 0) && index === 0 && isPrimary,
                  undefined,
                  undefined,
                  defaultAltText
                );
                return { image };
              } catch (error) {
                console.error(`URL ${index + 1} error:`, error.message);
                return { error: `Error with URL ${index + 1}: ${error.message}` };
              }
            },
            5 // Process 5 URLs concurrently
          )
        : Promise.resolve([])
    ]);

    // Process results efficiently
    const uploadedFiles = base64Results.filter(r => r.image).map(r => r.image);
    const uploadedUrls = urlResults.filter(r => r.image).map(r => r.image);
    const errors = [
      ...base64Results.filter(r => r.error).map(r => r.error),
      ...urlResults.filter(r => r.error).map(r => r.error)
    ];

    // Log processing time for performance monitoring
    const processingTime = Date.now() - startTime;
    console.log(`JSON images processed in ${processingTime}ms: ${uploadedFiles.length + uploadedUrls.length} successful, ${errors.length} failed`);

    return res.status(200).json({
      message: "Images processed",
      processingTimeMs: processingTime,
      uploadedFiles,
      uploadedUrls,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error.name === "SyntaxError") {
      console.error("JSON parsing error:", error);
      return res.status(400).json({ error: `Invalid JSON: ${error.message}` });
    }
    
    console.error("Server error in handleJsonUpload:", error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
};

// Main handler function to dispatch to appropriate processor based on content type
export const processUpload = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const contentType = req.headers["content-type"] || "";
    
    if (contentType.includes('application/json')) {
      // Handle JSON payload (for URLs and base64)
      return handleJsonUpload(req, res);
    } else if (contentType.includes('multipart/form-data')) {
      // Handle FormData (for file uploads)
      return handleFormDataUpload(req, res);
    } else {
      // For other content types, return an appropriate error
      return res.status(415).json({ 
        error: "Unsupported Media Type", 
        message: "Only JSON or multipart/form-data payloads are supported." 
      });
    }
  } catch (error) {
    console.error("Error in processUpload:", error);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
}

// Handler for single image upload (used by FormData in frontend)
export const handleSingleImageUpload = async (req: NextApiRequest, res: NextApiResponse) => {
  // Delegate to the FormData handler since it already handles single file case
  return handleFormDataUpload(req, res);
};
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
