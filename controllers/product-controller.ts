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
  addProductSize as addNewProductSize,
} from "../models/product"
import { ensureImageDimensions } from "../utils/image-utils"
import { getAllCategories } from "../models/category"
import formidable from 'formidable'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

// Config for file upload endpoints to disable body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

// Safe directory creation function that works in serverless environments
const ensureDir = (dirPath: string) => {
  // Only try to create directory if we're in a writable environment
  try {
    if (process.env.NODE_ENV !== 'production') {
      // In development, we can create directories as needed
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
    return true;
  } catch (error) {
    console.warn(`Warning: Could not create directory ${dirPath}`, error);
    return false;
  }
};

// Directory where uploads will be stored temporarily - use /tmp in production for Lambda compatibility
const UPLOADS_DIR = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'uploads') 
  : path.join(process.cwd(), 'uploads');

// Initialize uploads directory
ensureDir(UPLOADS_DIR);

export const getProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { limit, offset, category_id } = req.query

    const products = await getAllProducts(
      limit ? Number.parseInt(limit as string) : undefined,
      offset ? Number.parseInt(offset as string) : undefined,
      category_id ? Number.parseInt(category_id as string) : undefined,
    )

    return res.status(200).json({ products })
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

export const setPrimaryImage = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id, imageId } = req.query

    if (!id || !imageId) {
      return res.status(400).json({ error: "Product ID and Image ID are required" })
    }

    const productId = Number.parseInt(id as string)
    const imagId = Number.parseInt(imageId as string)
    
    const success = await setProductImageAsPrimary(productId, imagId)

    if (!success) {
      return res.status(404).json({ error: "Image not found" })
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
    const { image_url, is_primary, width, height, alt_text } = req.body

    if (!id || !image_url) {
      return res.status(400).json({ error: "Product ID and image URL are required" })
    }

    // Process the image to ensure it has dimensions
    const processedImage = ensureImageDimensions(
      image_url,
      width ? Number.parseInt(width as string) : undefined,
      height ? Number.parseInt(height as string) : undefined,
    )

    const image = await addProductImageByUrl(
      Number.parseInt(id as string),
      processedImage.url,
      is_primary,
      processedImage.width,
      processedImage.height,
      alt_text as string,
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
      return res.status(500).json({ error: "Could not access upload directory" });
    }

    // Parse the form data using formidable - fixed for newer formidable versions
    const options = {
      uploadDir: UPLOADS_DIR,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    };
    
    const form = formidable(options);

    return new Promise<void>((resolve) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Error parsing form:", err);
          res.status(500).json({ error: "Error parsing form data" });
          return resolve();
        }

        const productId = Number.parseInt(req.query.id as string);
        if (isNaN(productId)) {
          res.status(400).json({ error: "Invalid product ID" });
          return resolve();
        }

        // Get file from files object (formidable v4 returns arrays)
        const fileArray = files.image;
        const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

        if (!file) {
          res.status(400).json({ error: "No image file provided" });
          return resolve();
        }

        // Verify file is an image
        const mimeType = file.mimetype || '';
        if (!mimeType.startsWith('image/')) {
          // Clean up the file
          try {
            if (fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
          } catch (err) {
            console.warn("Could not delete non-image file:", err);
          }
          res.status(400).json({ error: "Only image files are allowed" });
          return resolve();
        }

        try {
          const isPrimary = fields.is_primary === 'true';
          const altText = fields.alt_text || `Image of product ${productId}`;

          // Generate a unique filename
          const uniqueFilename = `${uuidv4()}${path.extname(file.originalFilename || '')}`;
          
          // In production (serverless), use S3 or other storage service
          // This code assumes you're handling the public uploads differently in production
          let publicPath;
          
          if (process.env.NODE_ENV === 'production') {
            // For production, you would typically:
            // 1. Upload to S3 or similar service
            // 2. Get the public URL
            // This is a placeholder - implement your cloud storage logic here
            publicPath = `/api/images/${uniqueFilename}`; // A route that serves images
            
            // Keep the file in /tmp for now
            // In a real implementation, you'd upload to S3 here
          } else {
            // For development, save to local public directory
            publicPath = `/uploads/${uniqueFilename}`;
            const destinationPath = path.join(process.cwd(), 'public', 'uploads', uniqueFilename);
            
            // Ensure public uploads directory exists
            const uploadDir = path.dirname(destinationPath);
            ensureDir(uploadDir);
            
            // Move the file from temp location to public directory
            fs.copyFileSync(file.filepath, destinationPath);
          }
          
          // Clean up the temp file
          try {
            if (fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
          } catch (err) {
            console.warn("Could not delete temp file:", err);
          }

          // Process the image dimensions
          const processedImage = ensureImageDimensions(
            publicPath,
            fields.width ? Number.parseInt(fields.width as string) : undefined,
            fields.height ? Number.parseInt(fields.height as string) : undefined
          );

          // Save to database
          const image = await addProductImage(
            productId,
            publicPath,
            isPrimary,
            processedImage.width,
            processedImage.height,
            altText as string
          );

          res.status(201).json({ 
            message: "Image uploaded successfully", 
            image 
          });
        } catch (error) {
          console.error("Error processing uploaded image:", error);
          // Clean up the temp file if exists
          try {
            if (file && file.filepath && fs.existsSync(file.filepath)) {
              fs.unlinkSync(file.filepath);
            }
          } catch (err) {
            console.warn("Could not delete temp file during error cleanup:", err);
          }
          res.status(500).json({ error: "Failed to process uploaded image" });
        }

        return resolve();
      });
    });
  } catch (error) {
    console.error("Error in file upload:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

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
// controllers/product-controller.ts - Add this new function
export const addMultipleImages = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Ensure uploads directory exists
    if (!ensureDir(UPLOADS_DIR)) {
      return res.status(500).json({ error: "Could not access upload directory" });
    }

    const productId = Number.parseInt(req.query.id as string);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Create formidable form for parsing - fixed for newer formidable versions
    const options = {
      uploadDir: UPLOADS_DIR,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      multiples: true, // Allow multiple files
    };
    
    const form = formidable(options);

    return new Promise<void>((resolve) => {
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error("Error parsing form:", err);
          res.status(500).json({ error: "Error parsing form data" });
          return resolve();
        }

        const results = {
          uploadedFiles: [],
          uploadedUrls: [],
          errors: []
        };

        // Process file uploads first
        const fileArray = files.images;
        if (fileArray) {
          const imageFiles = Array.isArray(fileArray) ? fileArray : [fileArray];
          
          for (const file of imageFiles) {
            try {
              // Verify file is an image
              const mimeType = file.mimetype || '';
              if (!mimeType.startsWith('image/')) {
                // Skip non-image files
                results.errors.push(`File ${file.originalFilename} is not an image`);
                continue;
              }

              const isPrimary = fields.is_primary === 'true'; // Only first image will be primary if true
              const altText = fields.alt_text || `Image of product ${productId}`;

              // Generate a unique filename
              const uniqueFilename = `${uuidv4()}${path.extname(file.originalFilename || '')}`;
              
              // Set up file paths based on environment
              let publicPath;
              
              if (process.env.NODE_ENV === 'production') {
                publicPath = `/api/images/${uniqueFilename}`; // Production path placeholder
              } else {
                // For development, save to local public directory
                publicPath = `/uploads/${uniqueFilename}`;
                const destinationPath = path.join(process.cwd(), 'public', 'uploads', uniqueFilename);
                
                // Ensure public uploads directory exists
                const uploadDir = path.dirname(destinationPath);
                ensureDir(uploadDir);
                
                // Move the file from temp location to public directory
                fs.copyFileSync(file.filepath, destinationPath);
              }
              
              // Clean up the temp file
              try {
                if (fs.existsSync(file.filepath)) {
                  fs.unlinkSync(file.filepath);
                }
              } catch (cleanupErr) {
                console.warn("Could not delete temp file:", cleanupErr);
              }

              // Process the image dimensions
              const processedImage = ensureImageDimensions(
                publicPath,
                undefined,
                undefined
              );

              // Save to database
              const image = await addProductImage(
                productId,
                publicPath,
                isPrimary && results.uploadedFiles.length === 0 && results.uploadedUrls.length === 0, // Only first image is primary
                processedImage.width,
                processedImage.height,
                altText as string
              );

              results.uploadedFiles.push(image);
            } catch (fileError) {
              console.error("Error processing uploaded file:", fileError);
              results.errors.push(`Failed to process file ${file.originalFilename}: ${fileError.message}`);
            }
          }
        }

        // Process image URLs if provided in the fields
        try {
          const imageUrls = fields.image_urls;
          if (imageUrls) {
            // Convert to array if it's a string
            const urls = typeof imageUrls === 'string' 
              ? JSON.parse(imageUrls) 
              : (Array.isArray(imageUrls) ? imageUrls : [imageUrls]);
            
            for (let i = 0; i < urls.length; i++) {
              const url = urls[i];
              if (!url) continue;

              const isPrimary = fields.is_primary === 'true' && 
                results.uploadedFiles.length === 0 && 
                results.uploadedUrls.length === 0;
              const altText = fields.alt_text || `Image of product ${productId}`;

              // Process the image to ensure it has dimensions
              const processedImage = ensureImageDimensions(url, undefined, undefined);

              const image = await addProductImageByUrl(
                productId,
                processedImage.url,
                isPrimary,
                processedImage.width,
                processedImage.height,
                altText as string
              );

              results.uploadedUrls.push(image);
            }
          }
        } catch (urlError) {
          console.error("Error processing image URLs:", urlError);
          results.errors.push(`Failed to process image URLs: ${urlError.message}`);
        }

        // Return results
        if (results.uploadedFiles.length === 0 && results.uploadedUrls.length === 0) {
          if (results.errors.length > 0) {
            res.status(400).json({ 
              error: "Failed to upload any images", 
              details: results.errors 
            });
          } else {
            res.status(400).json({ error: "No images provided" });
          }
        } else {
          res.status(201).json({ 
            message: "Images uploaded successfully", 
            uploadedFiles: results.uploadedFiles,
            uploadedUrls: results.uploadedUrls,
            errors: results.errors.length > 0 ? results.errors : undefined
          });
        }

        return resolve();
      });
    });
  } catch (error) {
    console.error("Error in multiple image upload:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
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
}
