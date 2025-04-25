import axios from "axios"
import qs from "qs"

/**
 * Sends a verification code via WhatsApp using UltraMsg API
 *
 * @param phoneNumber - The recipient's phone number in international format
 * @param verificationCode - The verification code to send
 * @param countryCode - Optional country code (default: "234" for Nigeria)
 * @returns Object with success status and message ID or error
 */
export const sendWhatsAppVerificationCode = async (
  phoneNumber: string,
  verificationCode: string,
  countryCode = "234",
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    if (!process.env.ULTRAMSG_TOKEN || !process.env.ULTRAMSG_INSTANCE_ID) {
      console.error("UltraMsg configuration missing")
      return { success: false, error: "WhatsApp service configuration missing" }
    }

    // Format phone number to international format if needed
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber)

    // Create the message content
    const message = `Your Fashion Store verification code is: ${verificationCode}. This code will expire in 15 minutes.`

    // Prepare data for UltraMsg API
    const data = qs.stringify({
      token: process.env.ULTRAMSG_TOKEN,
      to: formattedPhoneNumber,
      body: message,
    })

    // Make the API request to UltraMsg
    const response = await axios({
      method: "post",
      url: `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    })

    // Check if the message was sent successfully
    if (response.data && response.data.sent) {
      return {
        success: true,
        messageId: response.data.id,
      }
    } else {
      console.error("WhatsApp sending failed with response:", response.data)
      return {
        success: false,
        error: `Failed to send WhatsApp message: ${response.data.error || "Unknown error"}`,
      }
    }
  } catch (error) {
    console.error("Error sending WhatsApp message via UltraMsg:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending WhatsApp message",
    }
  }
}

/**
 * Sends a password reset link via WhatsApp
 *
 * @param phoneNumber - The recipient's phone number in international format
 * @param resetLink - The password reset link
 * @param countryCode - Optional country code (default: "234" for Nigeria)
 * @returns Object with success status and message ID or error
 */
export const sendPasswordResetLink = async (
  phoneNumber: string,
  resetLink: string,
  countryCode = "234",
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    if (!process.env.ULTRAMSG_TOKEN || !process.env.ULTRAMSG_INSTANCE_ID) {
      console.error("UltraMsg configuration missing")
      return { success: false, error: "WhatsApp service configuration missing" }
    }

    // Format phone number to international format
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber)

    // Create the message with the reset link
    const message = `Click the link below to reset your Fashion Store password. This link will expire in 15 minutes.\n\n${resetLink}`

    // Prepare data for UltraMsg API
    const data = qs.stringify({
      token: process.env.ULTRAMSG_TOKEN,
      to: formattedPhoneNumber,
      body: message,
    })

    // Make the API request to UltraMsg
    const response = await axios({
      method: "post",
      url: `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    })

    // Check if the message was sent successfully
    if (response.data && response.data.sent) {
      return {
        success: true,
        messageId: response.data.id,
      }
    } else {
      console.error("WhatsApp link sending failed with response:", response.data)
      return {
        success: false,
        error: `Failed to send WhatsApp reset link: ${response.data.error || "Unknown error"}`,
      }
    }
  } catch (error) {
    console.error("Error sending WhatsApp reset link via UltraMsg:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error sending reset link",
    }
  }
}

const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters except the plus sign
  const cleaned = phoneNumber.replace(/[^\d+]/g, "")

  // Ensure the number starts with a plus sign
  if (!cleaned.startsWith("+")) {
    return "+" + cleaned
  }

  return cleaned
}

// Placeholder function to maintain API compatibility
// This is disabled as requested, but kept for API compatibility
export const sendSmsVerificationCode = async (
  phoneNumber: string,
  verificationCode: string,
  countryCode = "234",
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  console.warn("SMS verification is disabled. Using WhatsApp instead.")
  return sendWhatsAppVerificationCode(phoneNumber, verificationCode, countryCode)
}
