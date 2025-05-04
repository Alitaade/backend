import { query } from "@/database/connection"
import type { Category, CategoryInput } from "@/types"

export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const result = await query("SELECT * FROM categories ORDER BY name ASC")
    return result.rows
  } catch (error) {
    console.error("Error getting all categories:", error)
    throw error
  }
}

export const getCategoryById = async (id: number): Promise<Category | null> => {
  try {
    const result = await query("SELECT * FROM categories WHERE id = $1", [id])
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error getting category by ID:", error)
    throw error
  }
}

export const createCategory = async (categoryData: CategoryInput): Promise<Category> => {
  try {
    const result = await query("INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *", [
      categoryData.name,
      categoryData.description || null,
    ])

    return result.rows[0]
  } catch (error) {
    console.error("Error creating category:", error)
    throw error
  }
}

export const updateCategory = async (id: number, categoryData: Partial<CategoryInput>): Promise<Category | null> => {
  try {
    // Start building the query
    let queryText = "UPDATE categories SET "
    const queryParams: any[] = []
    let paramCounter = 1

    // Add each field that needs to be updated
    const updates: string[] = []

    if (categoryData.name !== undefined) {
      updates.push(`name = $${paramCounter++}`)
      queryParams.push(categoryData.name)
    }

    if (categoryData.description !== undefined) {
      updates.push(`description = $${paramCounter++}`)
      queryParams.push(categoryData.description)
    }

    // Add updated_at timestamp
    updates.push(`updated_at = $${paramCounter++}`)
    queryParams.push(new Date())

    // If there's nothing to update, return the current category
    if (updates.length === 0) {
      return getCategoryById(id)
    }

    // Complete the query
    queryText += updates.join(", ")
    queryText += ` WHERE id = $${paramCounter} RETURNING *`
    queryParams.push(id)

    // Execute the query
    const result = await query(queryText, queryParams)
    return result.rows.length > 0 ? result.rows[0] : null
  } catch (error) {
    console.error("Error updating category:", error)
    throw error
  }
}

export const deleteCategory = async (id: number): Promise<boolean> => {
  try {
    const result = await query("DELETE FROM categories WHERE id = $1 RETURNING id", [id])
    return result.rows.length > 0
  } catch (error) {
    console.error("Error deleting category:", error)
    throw error
  }
}
