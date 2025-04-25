import type { NextApiRequest, NextApiResponse } from "next";
import { findUserByEmail, findUserByPhone } from "@/models/user";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
} from "@/utils/phone-number-utils";

// Helper function to handle CORS
const setCorsHeaders = (res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://pro-project-gilt.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers for all requests
  setCorsHeaders(res);
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res
        .status(400)
        .json({ error: "Email or phone number is required" });
    }

    // Determine if identifier is email or phone
    const isEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(identifier);

    let exists = false;

    if (isEmail) {
      // Check if email exists
      const user = await findUserByEmail(identifier);
      exists = !!user;
    } else if (isValidPhoneNumber(identifier)) {
      // Format and check if phone exists
      const formattedPhone = formatPhoneNumber(identifier);
      const user = await findUserByPhone(formattedPhone);
      exists = !!user;
    } else {
      // Invalid format
      return res.status(400).json({
        error: "Invalid format. Please enter a valid email or phone number.",
      });
    }

    // Return whether the identifier exists
    return res.status(200).json({ exists });
  } catch (error) {
    console.error("Error checking identifier:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}