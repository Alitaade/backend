import type { NextApiRequest, NextApiResponse } from "next"
import { getProduct, updateExistingProduct, deleteExistingProduct } from "../../../controllers/product-controller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // For GET requests, proceed directly without CORS handling (public endpoint)
  if (req.method === "GET") {
    return getProduct(req, res);
  }
  
   
  // For all other methods (OPTIONS, PUT, DELETE), apply CORS handling first
  enableCors(req, res, async () => {
    // If it's an OPTIONS request, enableCors already handled it and returned
    // For other methods, continue with the appropriate handler
    switch (req.method) {
      case "PUT":
        // Admin only - update a product
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, () => {
            updateExistingProduct(req, res).finally(() => resolve())
          })
        })

      case "DELETE":
        // Admin only - delete a product
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, () => {
            deleteExistingProduct(req, res).finally(() => resolve())
          })
        })

      default:
        return res.status(405).json({ error: "Method not allowed" })
    }
  });
}