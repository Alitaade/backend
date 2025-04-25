import type { NextApiRequest, NextApiResponse } from "next"
import { getUserById, updateUserProfile } from "../../../controllers/user-controller"
import { authenticateUser } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  switch (req.method) {
    case "GET":
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, () => {
          getUserById(req, res).finally(() => resolve())
        })
      })

    case "PUT":
      return new Promise<void>((resolve) => {
        authenticateUser(req, res, () => {
          updateUserProfile(req, res).finally(() => resolve())
        })
      })

    default:
      res.setHeader("Allow", ["GET", "PUT", "OPTIONS"])
      return res.status(405).json({ error: "Method not allowed" })
  }
}

