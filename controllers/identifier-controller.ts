import type { NextApiRequest, NextApiResponse } from "next"
import { checkIdentifierExists } from "@/models/identifier"

export async function checkIdentifier(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { identifier } = req.body

    if (!identifier) {
      return res.status(400).json({ error: "Email or phone number is required" })
    }

    const { exists, isValid, error } = await checkIdentifierExists(identifier)

    if (!isValid) {
      return res.status(400).json({ error })
    }

    // Return whether the identifier exists
    return res.status(200).json({ exists })
  } catch (error) {
    console.error("Error checking identifier:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
