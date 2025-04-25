import type { NextApiRequest, NextApiResponse } from "next";
import { findUserById, validatePassword } from "../../../../models/user";
import { applyMiddleware } from "../../../../middleware/api-security";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id } = req.query;
    const { password } = req.body;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const userId = Number(id);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate password
    const isPasswordValid = await validatePassword(user, password);

    return res.status(200).json({ valid: isPasswordValid });
  } catch (error) {
    console.error("Error validating password:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default applyMiddleware(handler);
