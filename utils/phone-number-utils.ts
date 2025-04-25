/**
 * Formats a phone number to international format for Infobip
 * Handles various input formats and adds country code if missing
 * Note: Infobip WhatsApp API requires numbers without the + sign
 *
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number suitable for Infobip API (without +)
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters except the + sign initially
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // First ensure the number has the correct international format with +
  if (!cleaned.startsWith("+")) {
    // Common country codes to check for
    const countryCodes = [
      "1",
      "44",
      "234",
      "27",
      "254",
      "255",
      "256",
      "91",
      "86",
      "61",
      "33",
      "49",
    ];

    let foundCountryCode = false;

    // Check if the number starts with a known country code
    for (const code of countryCodes) {
      if (cleaned.startsWith(code)) {
        cleaned = "+" + cleaned;
        foundCountryCode = true;
        break;
      }
    }

    // If no country code was found
    if (!foundCountryCode) {
      // Special case for Nigerian numbers starting with 0
      if (cleaned.startsWith("0")) {
        // For Nigerian numbers starting with 0, replace with +234
        cleaned = "+234" + cleaned.substring(1);
      } else {
        // If we can't determine the country code, add + to make it international format
        // This assumes the number already has a country code without the +
        cleaned = "+" + cleaned;
      }
    }
  }

  // Now that we have a number in international format starting with +,
  // remove the + sign for Infobip API compatibility
  return cleaned.replace(/^\+/, "");
};

/**
 * Validates if a string is a valid phone number
 *
 * @param phoneNumber The phone number to validate
 * @returns Boolean indicating if the phone number is valid
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  // Basic validation for international phone numbers
  // This regex matches most international formats with or without country code
  const phoneRegex =
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;

  return (
    phoneRegex.test(phoneNumber) &&
    phoneNumber.replace(/[^\d]/g, "").length >= 7
  );
};

/**
 * Extracts the country code from a phone number
 *
 * @param phoneNumber The phone number to extract country code from
 * @returns The country code or null if not found
 */
export const extractCountryCode = (phoneNumber: string): string | null => {
  // Common country codes
  const countryCodes = {
    "1": "US/CA", // USA/Canada
    "44": "UK",
    "234": "NG", // Nigeria
    "27": "ZA", // South Africa
    "254": "KE", // Kenya
    "255": "TZ", // Tanzania
    "256": "UG", // Uganda
    "91": "IN", // India
    "86": "CN", // China
    "61": "AU", // Australia
    "33": "FR", // France
    "49": "DE", // Germany
  };

  // Clean the number and ensure it starts with +
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");
  const withPlus = cleaned.startsWith("+") ? cleaned : "+" + cleaned;

  // Try to match known country codes
  for (const [code, country] of Object.entries(countryCodes)) {
    if (withPlus.startsWith(`+${code}`)) {
      return code;
    }
  }

  return null;
};
