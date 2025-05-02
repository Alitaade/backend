/**
 * Utility functions for handling images in the e-commerce application
 */

// Default image dimensions for different types of images
export const DEFAULT_IMAGE_DIMENSIONS = {
  thumbnail: { width: 300, height: 400 },
  product: { width: 800, height: 1067 },
  banner: { width: 1920, height: 600 },
  carousel: { width: 1200, height: 1600 },
}

// Function to validate image URL - modified to accept any URL and local files
export const validateImageUrl = (url: string): boolean => {
  // Accept local file uploads (which will be represented as relative paths)
  if (url.startsWith('/') || url.startsWith('./')) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol.toLowerCase();

    // Only allow http and https protocols
    if (protocol !== "http:" && protocol !== "https:") {
      return false;
    }

    // Check if the URL has a valid image extension
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif", ".bmp", ".tiff"];
    const path = parsedUrl.pathname.toLowerCase();
    
    // Accept any domain but still verify image extensions
    return validExtensions.some(ext => path.endsWith(ext)) || 
           // Also allow URLs with "image" in the path or containing "image" in query params
           path.includes('image') || 
           parsedUrl.search.toLowerCase().includes('image');
  } catch (error) {
    // If URL parsing fails but the string looks like a base64 data URL for an image
    if (url.startsWith('data:image/')) {
      return true;
    }
    return false;
  }
}

// Function to generate image dimensions if not provided
export const generateImageDimensions = (
  imageType: "thumbnail" | "product" | "banner" | "carousel",
): { width: number; height: number } => {
  return DEFAULT_IMAGE_DIMENSIONS[imageType]
}

// Function to generate alt text if not provided
export const generateAltText = (productName: string, imageIndex: number): string => {
  const positions = ["Front view", "Side view", "Back view", "Detail view", "Lifestyle view"]
  const position = positions[imageIndex % positions.length]

  return `${position} of ${productName}`
}

// Function to optimize image URL for different sizes
export const getOptimizedImageUrl = (
  originalUrl: string,
  size: "thumbnail" | "small" | "medium" | "large" | "original" = "medium",
): string => {
  // Handle local files - don't try to optimize them
  if (originalUrl.startsWith('/') || originalUrl.startsWith('./') || originalUrl.startsWith('data:')) {
    return originalUrl;
  }

  try {
    const parsedUrl = new URL(originalUrl);
    
    // Handle Unsplash images
    if (originalUrl.includes("unsplash.com")) {
      // Extract any existing query parameters
      const [baseUrl, existingQuery] = originalUrl.split("?")
      const params = new URLSearchParams(existingQuery || "")

      // Set dimensions based on size
      switch (size) {
        case "thumbnail":
          params.set("w", DEFAULT_IMAGE_DIMENSIONS.thumbnail.width.toString())
          params.set("h", DEFAULT_IMAGE_DIMENSIONS.thumbnail.height.toString())
          break
        case "small":
          params.set("w", "600")
          break
        case "medium":
          params.set("w", "1200")
          break
        case "large":
          params.set("w", "1800")
          break
        case "original":
          // Don't set width/height for original
          break
      }

      // Always ensure good quality and format
      if (size !== "original") {
        params.set("q", "80")
        params.set("auto", "format")
        params.set("fit", "crop")
      }

      return `${baseUrl}?${params.toString()}`
    }
    
    // For other image sources, just return the original URL
    return originalUrl;
  } catch (error) {
    // If URL parsing fails, return the original
    return originalUrl;
  }
}

// Function to prepare images for carousel display
export const prepareCarouselImages = (
  images: Array<{ image_url: string; width?: number; height?: number; alt_text?: string }>,
  productName: string,
): Array<{ url: string; width: number; height: number; alt: string }> => {
  return images.map((image, index) => {
    const dimensions =
      image.width && image.height ? { width: image.width, height: image.height } : DEFAULT_IMAGE_DIMENSIONS.carousel

    const alt = image.alt_text || generateAltText(productName, index)

    // Optimize the image URL for carousel display
    const optimizedUrl = getOptimizedImageUrl(image.image_url, "medium")

    return {
      url: optimizedUrl,
      width: dimensions.width,
      height: dimensions.height,
      alt,
    }
  })
}

// Function to ensure image has proper dimensions
export const ensureImageDimensions = (
  imageUrl: string,
  width?: number,
  height?: number,
): { url: string; width: number; height: number } => {
  // If dimensions are provided, use them
  if (width && height) {
    return {
      url: getOptimizedImageUrl(imageUrl, "original"),
      width,
      height,
    }
  }

  // Otherwise use default carousel dimensions
  const dimensions = DEFAULT_IMAGE_DIMENSIONS.carousel

  // Add dimensions to URL if it's an Unsplash image
  if (imageUrl && imageUrl.includes("unsplash.com")) {
    return {
      url: getOptimizedImageUrl(imageUrl, "medium"),
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  // For other images, just return with default dimensions
  return {
    url: imageUrl,
    width: dimensions.width,
    height: dimensions.height,
  }
}