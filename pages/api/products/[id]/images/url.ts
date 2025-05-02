import type { NextApiRequest, NextApiResponse } from "next";
import { addImageByUrl, addImageFromFile } from "../../../../../controllers/product-controller";
import { requireAdmin, enableCors } from "../../../../../middleware/auth-middleware";

// Disable the built-in NextJS body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  enableCors(req, res, async () => {
    switch (req.method) {
      case "POST":
        // Admin only - add an image to a product
        return new Promise<void>((resolve) => {
          requireAdmin(req, res, () => {
            // Check content-type to determine if it's a file upload or URL-based
            const contentType = req.headers["content-type"] || "";
            
            if (contentType.includes("multipart/form-data")) {
              // Handle file upload
              addImageFromFile(req, res).finally(() => resolve());
            } else {
              // Handle URL-based upload
              addImageByUrl(req, res).finally(() => resolve());
            }
          });
        });

      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  });
}