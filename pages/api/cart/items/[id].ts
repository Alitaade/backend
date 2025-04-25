import type { NextApiRequest, NextApiResponse } from "next"
import { removeItem } from "../../../../controllers/cart-controller"
import { authenticateUser } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  switch (req.method) {
    case "DELETE":
      // Authenticated user - remove item from cart
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, () => {
          removeItem(req, res).finally(() => resolve())
        })
      })

    default:
      res.setHeader("Allow", ["DELETE", "OPTIONS"])
      return res.status(405).json({ error: "Method not allowed" })
  }
}

