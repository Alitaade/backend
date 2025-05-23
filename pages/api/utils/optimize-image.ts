// api/optimize-image.ts - Enhanced image optimization endpoint
import type { NextApiRequest, NextApiResponse } from "next";
import sharp from "sharp";
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb", // Increased from 10mb
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Improved CORS handling with caching
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");
  res.setHeader("Access-Control-Max-Age", "86400"); // Cache OPTIONS response for 24 hours
  
  // Handle OPTIONS request immediately
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  
  enableCors(req, res, async () => {
    requireAdmin(req, res, async () => {
      // Allow both POST and PUT methods
      if (req.method !== "POST" && req.method !== "PUT") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      try {
        const { 
          image, 
          format = "jpeg", 
          quality = 85, // Default to slightly lower quality for better compression
          skipOptimization = false,
          maxWidth = 2000 // Maximum width parameter
        } = req.body;

        if (!image || typeof image !== "string") {
          return res.status(400).json({ error: "Invalid image data" });
        }
        
        // Skip optimization if requested (for already optimized images)
        if (skipOptimization) {
          return res.status(200).json({
            optimizedImage: image,
            originalSize: 0,
            optimizedSize: 0,
            compressionRatio: 1,
            optimized: false
          });
        }

        // Extract base64 data
        const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!base64Match) {
          return res.status(400).json({ error: "Invalid image format" });
        }
        
        const imageFormat = base64Match[1];
        const base64Data = base64Match[2];
        const buffer = Buffer.from(base64Data, "base64");
        
        // Skip optimization for small images (under 150KB)
        // Increased threshold to avoid unnecessary processing
        if (buffer.length < 150 * 1024) {
          return res.status(200).json({
            optimizedImage: image,
            originalSize: buffer.length,
            optimizedSize: buffer.length,
            compressionRatio: 1,
            optimized: false
          });
        }

        // Process with sharp for larger images
        let sharpInstance = sharp(buffer);
        let outputFormat: string;
        let metadata = await sharpInstance.metadata();
        let resized = false;

        // Resize oversized images if they exceed maxWidth
        if (metadata.width && metadata.width > maxWidth) {
          sharpInstance = sharpInstance.resize(maxWidth);
          resized = true;
        }

        // Determine output format
        switch (format.toLowerCase()) {
          case "png":
            sharpInstance = sharpInstance.png({ 
              quality: Number(quality),
              compressionLevel: 9 // Maximum compression
            });
            outputFormat = "image/png";
            break;
          case "webp":
            sharpInstance = sharpInstance.webp({ 
              quality: Number(quality),
              effort: 6 // Higher compression effort
            });
            outputFormat = "image/webp";
            break;
          default:
            // Use mozjpeg for better JPEG compression
            sharpInstance = sharpInstance.jpeg({
              quality: Number(quality),
              mozjpeg: true,
            });
            outputFormat = "image/jpeg";
        }

        // Get optimized buffer
        const optimizedBuffer = await sharpInstance.toBuffer();

        // Only return optimized version if it's actually smaller
        if (optimizedBuffer.length < buffer.length) {
          const optimizedBase64 = `data:${outputFormat};base64,${optimizedBuffer.toString("base64")}`;
          return res.status(200).json({
            optimizedImage: optimizedBase64,
            originalSize: buffer.length,
            optimizedSize: optimizedBuffer.length,
            compressionRatio: optimizedBuffer.length / buffer.length,
            optimized: true,
            resized
          });
        } else {
          // If optimization didn't help, return original
          return res.status(200).json({
            optimizedImage: image,
            originalSize: buffer.length,
            optimizedSize: buffer.length,
            compressionRatio: 1,
            optimized: false,
            resized
          });
        }
      } catch (error) {
        console.error("Image optimization error:", error);
        return res.status(500).json({
          error: "Failed to optimize image",
          details: error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    });
  });
}