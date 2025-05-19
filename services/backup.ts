import {
  S3Client,
  ListObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { sdkStreamMixin } from "@smithy/util-stream"
import crypto from "crypto"
import type { Readable } from "stream"

// Environment variables (these should be in your .env file)
const S3_REGION = process.env.S3_REGION
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY
const S3_SECRET_KEY = process.env.S3_SECRET_KEY
const S3_ENDPOINT = process.env.S3_ENDPOINT
const S3_BUCKET = process.env.S3_BUCKET
const S3_URL_EXPIRATION = Number.parseInt(process.env.S3_URL_EXPIRATION || "3600") // Default 1 hour

// The public domain for accessing files directly
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || ""

// Initialize S3 client
const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  endpoint: S3_ENDPOINT,
})

/**
 * Generate a unique key for storing an object
 * @param prefix Optional prefix for the key (e.g., 'products/')
 * @returns A unique key string
 */
const generateUniqueKey = (prefix = "products/"): string => {
  const timestamp = Date.now()
  const randomString = crypto.randomBytes(8).toString("hex")
  return `${prefix}${timestamp}-${randomString}`
}

/**
 * Extract file extension from mime type or filename
 * @param mimeType The MIME type of the file
 * @param filename Optional filename to extract extension from
 * @returns File extension with dot (e.g., '.jpg')
 */
const getFileExtension = (mimeType: string, filename?: string): string => {
  // Try to get extension from filename first
  if (filename) {
    const parts = filename.split(".")
    if (parts.length > 1) {
      return `.${parts[parts.length - 1].toLowerCase()}`
    }
  }

  // Map common MIME types to extensions
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
  }

  return mimeToExt[mimeType] || ".bin"
}

/**
 * Get a public URL for an object (no authentication required)
 * @param key The key of the object
 * @returns Public URL for the object
 */
export const getPublicObjectUrl = (key: string): string => {
  return `${PUBLIC_DOMAIN}/${S3_BUCKET}/${key}`
}

/**
 * Upload a buffer to S3
 * @param buffer The buffer to upload
 * @param mimeType The MIME type of the file
 * @param filename Optional filename
 * @param metadata Optional metadata to store with the object
 * @returns Object with key and url of the uploaded file
 */
export const uploadBuffer = async (
  buffer: Buffer,
  mimeType: string,
  filename?: string,
  metadata?: Record<string, string>,
): Promise<{ key: string; url: string }> => {
  try {
    const extension = getFileExtension(mimeType, filename)
    const key = `${generateUniqueKey()}${extension}`

    const params = {
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      Metadata: metadata,
    }

    await s3Client.send(new PutObjectCommand(params))

    // Generate a public URL for the uploaded object
    const url = getPublicObjectUrl(key)

    return { key, url }
  } catch (error) {
    console.error("Error uploading buffer to S3:", error)
    throw new Error(`Failed to upload file to storage: ${error.message}`)
  }
}

/**
 * Upload a base64 data URL to S3
 * @param base64Data The base64 data URL string
 * @param filename Optional filename
 * @param metadata Optional metadata to store with the object
 * @returns Object with key and url of the uploaded file
 */
export const uploadBase64 = async (
  base64Data: string,
  filename?: string,
  metadata?: Record<string, string>,
): Promise<{ key: string; url: string }> => {
  try {
    // Extract MIME type and base64 data
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)

    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 format")
    }

    const mimeType = matches[1]
    const buffer = Buffer.from(matches[2], "base64")

    return await uploadBuffer(buffer, mimeType, filename, metadata)
  } catch (error) {
    console.error("Error uploading base64 to S3:", error)
    throw new Error(`Failed to upload base64 to storage: ${error.message}`)
  }
}

/**
 * Get a signed URL for an object (for operations that require authentication)
 * @param key The key of the object
 * @param expiresIn Expiration time in seconds (default: from env or 3600)
 * @returns Signed URL for the object
 */
export const getSignedObjectUrl = async (key: string, expiresIn = S3_URL_EXPIRATION): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    })

    return await getSignedUrl(s3Client, command, { expiresIn })
  } catch (error) {
    console.error("Error generating signed URL:", error)
    throw new Error(`Failed to generate signed URL: ${error.message}`)
  }
}

/**
 * Get object URL - uses public URL by default, falls back to signed URL if needed
 * @param key The key of the object
 * @returns URL for the object
 */
export const getObjectUrl = async (key: string): Promise<string> => {
  // Always use the public URL since it works
  return getPublicObjectUrl(key)
}

/**
 * Download an object from S3
 * @param key The key of the object to download
 * @returns Buffer containing the object data
 */
export const downloadObject = async (key: string): Promise<Buffer> => {
  try {
    const data = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    )

    // Convert stream to buffer
    const stream = sdkStreamMixin(data.Body) as unknown as Readable
    return await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      stream.on("data", (chunk) => chunks.push(chunk))
      stream.on("error", reject)
      stream.on("end", () => resolve(Buffer.concat(chunks)))
    })
  } catch (error) {
    console.error("Error downloading object from S3:", error)
    throw new Error(`Failed to download file: ${error.message}`)
  }
}

/**
 * Delete an object from S3
 * @param key The key of the object to delete
 * @returns True if deletion was successful
 */
export const deleteObject = async (key: string): Promise<boolean> => {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    )
    return true
  } catch (error) {
    console.error("Error deleting object from S3:", error)
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Delete multiple objects from S3
 * @param keys Array of keys to delete
 * @returns True if deletion was successful
 */
export const deleteMultipleObjects = async (keys: string[]): Promise<boolean> => {
  if (keys.length === 0) return true

  try {
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: S3_BUCKET,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      }),
    )
    return true
  } catch (error) {
    console.error("Error deleting multiple objects from S3:", error)
    throw new Error(`Failed to delete files: ${error.message}`)
  }
}

/**
 * List objects in a directory
 * @param prefix Directory prefix to list
 * @returns Array of object keys
 */
export const listObjects = async (prefix = "products/"): Promise<string[]> => {
  try {
    const data = await s3Client.send(
      new ListObjectsCommand({
        Bucket: S3_BUCKET,
        Prefix: prefix,
      }),
    )

    return (data.Contents || []).map((item) => item.Key).filter(Boolean) as string[]
  } catch (error) {
    console.error("Error listing objects in S3:", error)
    throw new Error(`Failed to list files: ${error.message}`)
  }
}

/**
 * Check if an object exists in S3
 * @param key The key to check
 * @returns True if the object exists
 */
export const objectExists = async (key: string): Promise<boolean> => {
  try {
    await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    )
    return true
  } catch (error) {
    if (error.name === "NoSuchKey") {
      return false
    }
    throw error
  }
}
