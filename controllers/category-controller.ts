import type { NextApiRequest, NextApiResponse } from "next"
import { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from "../models/category"

export const getCategories = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const categories = await getAllCategories()

    return res.status(200).json({ categories })
  } catch (error) {
    console.error("Error getting categories:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const getCategory = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Category ID is required" })
    }

    const category = await getCategoryById(Number.parseInt(id as string))

    if (!category) {
      return res.status(404).json({ error: "Category not found" })
    }

    return res.status(200).json({ category })
  } catch (error) {
    console.error("Error getting category:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const createNewCategory = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ error: "Category name is required" })
    }

    const category = await createCategory({ name, description })

    return res.status(201).json({ message: "Category created successfully", category })
  } catch (error) {
    console.error("Error creating category:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const updateExistingCategory = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query
    const { name, description } = req.body

    if (!id) {
      return res.status(400).json({ error: "Category ID is required" })
    }

    const category = await updateCategory(Number.parseInt(id as string), { name, description })

    if (!category) {
      return res.status(404).json({ error: "Category not found" })
    }

    return res.status(200).json({ message: "Category updated successfully", category })
  } catch (error) {
    console.error("Error updating category:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

export const deleteExistingCategory = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: "Category ID is required" })
    }

    const success = await deleteCategory(Number.parseInt(id as string))

    if (!success) {
      return res.status(404).json({ error: "Category not found" })
    }

    return res.status(200).json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error("Error deleting category:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}

