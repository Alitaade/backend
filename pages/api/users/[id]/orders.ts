import type { NextApiRequest, NextApiResponse } from "next"
import { requireAdmin, enableCors } from "../../../../middleware/auth-middleware"
import { deleteAllUserOrdersController } from "../../../../controllers/order-controller"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  // This endpoint requires admin privileges
  return new Promise<void>((resolve, reject) => {
    enableCors(req, res, async () => {
      requireAdmin(req, res, async () => {
        try {
          switch (req.method) {
            case "DELETE":
              // Use the updated controller function
              await deleteAllUserOrdersController(req, res)
              break

            default:
              res.status(405).json({ error: "Method not allowed" })
          }

          resolve()
        } catch (error) {
          console.error("Error in user orders API handler:", error)
          res.status(500).json({ error: "Internal server error" })
          reject(error)
        }
      })
    })
  })
}