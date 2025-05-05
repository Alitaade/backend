import type { NextApiRequest, NextApiResponse } from "next"
import { deleteImage } from "../../../../../../controllers/product-controller"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Extract the product ID and image ID from the URL
  const { id: productId, imageId } = req.query

  if (!productId || !imageId) {
    return res.status(400).json({ error: "Product ID and Image ID are required" })
  }

  switch (req.method) {
    case "DELETE":
      try {
        // Pass the image ID to the controller
        req.query.imageId = imageId as string
        return await deleteImage(req, res)
      } catch (error) {
        console.error("Error in DELETE /products/[id]/images/[imageId]:", error)
        return res.status(500).json({ error: "Internal server error" })
      }
      break

    default:
      res.setHeader("Allow", ["DELETE"])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}
