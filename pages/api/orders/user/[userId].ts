import type { NextApiRequest, NextApiResponse } from "next"
import { getUserOrderHistory } from "../../../../controllers/order-controller"
import { authenticateUser } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      // Authenticated user - get order history for a user
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, () => {
          getUserOrderHistory(req, res).finally(() => resolve())
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}

