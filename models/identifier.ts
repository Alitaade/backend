import { findUserByEmail, findUserByPhone } from "./user"
import { formatPhoneNumber, isValidPhoneNumber } from "../utils/phone-number-utils"

export async function checkIdentifierExists(identifier: string): Promise<{
  exists: boolean
  isValid: boolean
  error?: string
}> {
  // Determine if identifier is email or phone
  const isEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(identifier)

  if (isEmail) {
    // Check if email exists
    const user = await findUserByEmail(identifier)
    return { exists: !!user, isValid: true }
  } else if (isValidPhoneNumber(identifier)) {
    // Format and check if phone exists
    const formattedPhone = formatPhoneNumber(identifier)
    const user = await findUserByPhone(formattedPhone)
    return { exists: !!user, isValid: true }
  } else {
    // Invalid format
    return {
      exists: false,
      isValid: false,
      error: "Invalid format. Please enter a valid email or phone number.",
    }
  }
}
