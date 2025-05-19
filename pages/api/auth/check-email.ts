// pages/api/auth/check-email.ts
import type { NextApiRequest, NextApiResponse } from "next"
import { checkEmail } from "../../../controllers/email-check-controller"
import { enableCors } from "../../../middleware/auth-middleware"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  enableCors(req, res, () => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" })
    }

    return checkEmail(req, res)
  })
}