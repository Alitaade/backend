import { findUserByEmail } from "@/models/user"

export async function checkEmailExists(email: string): Promise<boolean> {
  const existingUser = await findUserByEmail(email)
  return !!existingUser
}

export async function checkEmailForReset(email: string): Promise<{
  exists: boolean
  hasContactInfo: boolean
  user?: any
}> {
  const existingUser = await findUserByEmail(email)

  if (!existingUser) {
    return {
      exists: false,
      hasContactInfo: false,
    }
  }

  // Check if user has a WhatsApp number or phone number
  const hasContactInfo = !!(existingUser.whatsapp || existingUser.phone)

  return {
    exists: true,
    hasContactInfo,
    user: existingUser,
  }
}
