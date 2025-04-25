import type { NextApiRequest, NextApiResponse } from "next"
import { completeProfile } from "../../../../controllers/auth-controller"
import { authenticateUser } from "../../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "PUT, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    return res.status(200).end()
  }

  // Only allow PUT method for profile completion
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"])
    return res.status(405).json({ error: "Method not allowed" })
  }

  // Authenticate user before allowing profile completion
  return new Promise<void>((resolve) => {
    authenticateUser(req, res, () => {
      completeProfile(req, res).finally(() => resolve())
    })
  })
}

