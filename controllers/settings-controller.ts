import type { NextApiRequest, NextApiResponse } from "next"

export const getAdminContact = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Get admin contact information from environment variables
    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER || "+1234567890"

    console.log("Fetching admin contact info, WhatsApp:", adminWhatsApp)

    // Set CORS headers to ensure frontend can access this
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    res.status(200).json({
      adminWhatsApp,
    })
  } catch (error) {
    console.error("Error fetching admin contact:", error)
    res.status(500).json({ error: "Internal server error" })
  }
}

