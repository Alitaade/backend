import type { NextApiRequest, NextApiResponse } from "next";
import { updateUserPassword } from "../../../../controllers/user-controller";
import { authenticateUser } from "../../../../middleware/auth-middleware";
import { applyMiddleware } from "../../../../middleware/api-security";

// Create a handler that applies authentication then calls the update function
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow PUT method for password updates
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  return new Promise<void>((resolve) => {
    // First apply the authentication middleware
    authenticateUser(req, res, () => {
      // Then call the controller function
      updateUserPassword(req, res).finally(() => resolve());
    });
  });
}

// Apply general security middleware (CORS, rate limiting, etc.)
export default applyMiddleware(handler);
