import type { NextApiRequest, NextApiResponse } from "next";
import { addImageByUrl } from "../../../../../controllers/product-controller";
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  enableCors(req, res, async () => {
    switch (req.method) {
      case "POST":
        // Admin only - add an image to a product by URL
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, () => {
            addImageByUrl(req, res).finally(() => resolve());
          });
        });

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  });
}