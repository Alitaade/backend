import type { NextApiRequest, NextApiResponse } from "next";
import { findUserById, updateUser, validatePassword } from "../models/user";

export const getUserById = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await findUserById(Number(id));
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    // Log successful user retrieval
    console.log(`User data retrieved successfully for ID: ${id}`);

    return res.status(200).json({ user: userWithoutPassword });
  } catch (error) {
    console.error("Error getting user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUserProfile = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const { id } = req.query;
    const { first_name, last_name, email, phone, address } = req.body;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    console.log(`Updating profile for user ID: ${id}`, {
      first_name,
      last_name,
      email,
      phone,
      address,
    });

    const userId = Number(id);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user profile
    const updatedUser = await updateUser(userId, {
      first_name,
      last_name,
      email,
      phone,
      address,
    });

    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to update user profile" });
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;

    console.log(`Profile updated successfully for user ID: ${id}`);

    return res.status(200).json({
      message: "User profile updated successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateUserPassword = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  try {
    const { id } = req.query;
    const { currentPassword, newPassword } = req.body;

    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    // Password validation
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long" });
    }

    if (!/[a-z]/.test(newPassword)) {
      return res
        .status(400)
        .json({ error: "Password must contain at least one lowercase letter" });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res
        .status(400)
        .json({ error: "Password must contain at least one uppercase letter" });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res
        .status(400)
        .json({ error: "Password must contain at least one number" });
    }
    
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) {
      return res
        .status(400)
        .json({
          error: "Password must contain at least one special character",
        });
    }
    const userId = Number(id);
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Validate current password
    const isPasswordValid = await validatePassword(user, currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Update password
    const updatedUser = await updateUser(userId, { password: newPassword });

    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to update password" });
    }

    console.log(`Password updated successfully for user ID: ${id}`);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
