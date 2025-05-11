import type { NextApiRequest, NextApiResponse } from "next"
import sharp from "sharp"

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb", // Increase limit for larger images
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { image, format = "jpeg", quality = 90 } = req.body

    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Invalid image data" })
    }

    // Extract base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "")
    const buffer = Buffer.from(base64Data, "base64")

    // Process with sharp
    let sharpInstance = sharp(buffer)
    let outputFormat: string

    // Determine output format
    switch (format.toLowerCase()) {
      case "png":
        sharpInstance = sharpInstance.png({ quality: Number(quality) })
        outputFormat = "image/png"
        break
      case "webp":
        sharpInstance = sharpInstance.webp({ quality: Number(quality) })
        outputFormat = "image/webp"
        break
      case "avif":
        sharpInstance = sharpInstance.avif({ quality: Number(quality) })
        outputFormat = "image/avif"
        break
      default:
        sharpInstance = sharpInstance.jpeg({
          quality: Number(quality),
          mozjpeg: true,
        })
        outputFormat = "image/jpeg"
    }

    // Get optimized buffer
    const optimizedBuffer = await sharpInstance.toBuffer()

    // Return as base64
    const optimizedBase64 = `data:${outputFormat};base64,${optimizedBuffer.toString("base64")}`

    return res.status(200).json({
      optimizedImage: optimizedBase64,
      originalSize: buffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: buffer.length > 0 ? optimizedBuffer.length / buffer.length : 1,
    })
  } catch (error) {
    console.error("Image optimization error:", error)
    return res.status(500).json({
      error: "Failed to optimize image",
      details: error.message,
    })
  }
}
