import type { NextApiRequest, NextApiResponse } from "next";
import { applyApiSecurity } from "../../../middleware/api-security";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Apply security middleware
  return new Promise<void>((resolve) => {
    applyApiSecurity(req, res, async () => {
      try {
        // Only allow GET method
        if (req.method !== "GET") {
          res.setHeader("Allow", ["GET"]);
          res.status(405).json({ error: "Method not allowed" });
          return resolve();
        }

        // Get admin contact information from environment variables
        const adminWhatsApp =
          process.env.ADMIN_WHATSAPP_NUMBER || "+1234567890";

        console.log(
          "Admin contact API called, returning WhatsApp:",
          adminWhatsApp
        );

        res.status(200).json({
          adminWhatsApp,
        });
      } catch (error) {
        console.error("Error in admin contact API:", error);
        res.status(500).json({ error: "Internal server error" });
      }
      resolve();
    });
  });
}
