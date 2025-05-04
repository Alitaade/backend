import type { NextApiRequest, NextApiResponse } from "next"
import { getCategories, createNewCategory } from "../../../controllers/category-controller"
import { requireAdmin, enableCors } from "../../../middleware/auth-middleware";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    switch (req.method) {
      case "GET":
        return await getCategories(req, res)
      case "POST":
        enableCors(req, res, async () => {
        requireAdmin(req, res, async () => {
        return await createNewCategory(req, res)
        })
      })
      default:
        res.setHeader("Allow", ["GET", "POST", "OPTIONS"])
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
    }
  } catch (error) {
    console.error("Unhandled error in categories handler:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
