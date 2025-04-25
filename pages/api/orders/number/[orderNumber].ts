import type { NextApiRequest, NextApiResponse } from "next"
import { getOrderByNumber } from "../../../../controllers/order-controller"
import { authenticateUser } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      // Authenticated user - get order by order number
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, () => {
          getOrderByNumber(req, res).finally(() => resolve())
        })
      })

    default:
      return res.status(405).json({ error: "Method not allowed" })
  }
}

