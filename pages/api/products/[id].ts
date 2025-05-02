// In pages/api/products/[id].ts
import type { NextApiRequest, NextApiResponse } from "next"
import { getProduct, updateExistingProduct, deleteExistingProduct } from "../../../controllers/product-controller"
import { requireAdmin } from "../../../middleware/auth-middleware"

// CORS middleware
function enableCors(req: NextApiRequest, res: NextApiResponse, next: () => void) {
  res.setHeader('Access-Control-Allow-Origin', 'https://admin-frontends.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise((resolve) => {
    const handleRequest = () => {
      switch (req.method) {
        case "GET":
          getProduct(req, res).finally(() => resolve());
          break;

        case "PUT":
          requireAdmin(req, res, () => {
            updateExistingProduct(req, res).finally(() => resolve());
          });
          break;

        case "DELETE":
          requireAdmin(req, res, () => {
            deleteExistingProduct(req, res).finally(() => resolve());
          });
          break;

        default:
          res.status(405).json({ error: "Method not allowed" });
          resolve();
      }
    };

    // Only apply CORS for non-GET requests
    if (req.method !== "GET") {
      enableCors(req, res, handleRequest);
    } else {
      handleRequest();
    }
  });
}
