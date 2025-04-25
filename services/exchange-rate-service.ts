import axios from "axios"
import NodeCache from "node-cache"

// Cache exchange rates for 1 hour (3600 seconds)
const rateCache = new NodeCache({ stdTTL: 3600 })

// Primary exchange rate API endpoint
const EXCHANGE_API_URL = "https://api.exchangerate-api.com/v4/latest/USD"

/**
 * Get all exchange rates relative to USD
 * Uses the exchange rate API with caching
 */
export const getAllExchangeRates = async (): Promise<Record<string, number>> => {
  try {
    // Check if we have cached rates
    const cachedRates = rateCache.get<Record<string, number>>("USD_RATES")
    if (cachedRates) {
      console.log("Using cached exchange rates")
      return cachedRates
    }

    console.log("Fetching fresh exchange rates from API...")

    // Fetch rates from the API
    const response = await axios.get(EXCHANGE_API_URL, { timeout: 10000 })

    if (response.data && response.data.rates) {
      console.log("Successfully fetched exchange rates from API")

      // Cache the rates
      rateCache.set("USD_RATES", response.data.rates)
      return response.data.rates
    } else {
      throw new Error("Invalid response format from exchange rate API")
    }
  } catch (error) {
    console.error("Error fetching exchange rates:", error)
    throw error
  }
}

/**
 * Get the exchange rate for a specific currency relative to USD
 */
export const getUsdToRate = async (currency: string): Promise<number> => {
  try {
    // Normalize currency code
    const currencyCode = currency.toUpperCase()

    // Check if we have a cached rate for this specific currency
    const cachedRate = rateCache.get<number>(`USD_TO_${currencyCode}`)
    if (cachedRate) {
      return cachedRate
    }

    // Get all rates and extract the one we need
    const rates = await getAllExchangeRates()

    if (rates[currencyCode]) {
      rateCache.set(`USD_TO_${currencyCode}`, rates[currencyCode])
      return rates[currencyCode]
    }

    throw new Error(`Currency ${currencyCode} not found in exchange rates`)
  } catch (error) {
    console.error(`Error getting USD to ${currency} rate:`, error)
    throw error
  }
}

/**
 * Get the USD to NGN exchange rate
 * This is a specialized function since NGN is commonly used
 */
export const getUsdToNgnRate = async (): Promise<number> => {
  try {
    // Check if we have a cached NGN rate
    const cachedRate = rateCache.get<number>("USD_NGN")
    if (cachedRate) {
      console.log("Using cached NGN exchange rate:", cachedRate)
      return cachedRate
    }

    // Get all rates and extract NGN
    const rates = await getAllExchangeRates()

    if (rates.NGN) {
      console.log(`Using NGN exchange rate from API: ${rates.NGN}`)
      rateCache.set("USD_NGN", rates.NGN)
      return rates.NGN
    }

    throw new Error("NGN exchange rate not found in API response")
  } catch (error) {
    console.error("Error getting USD to NGN rate:", error)
    throw error
  }
}

/**
 * Convert USD amount to another currency
 */
export const convertUsdTo = async (amountUsd: number, targetCurrency: string): Promise<number> => {
  const rate = await getUsdToRate(targetCurrency)
  return amountUsd * rate
}

/**
 * Get the current exchange rates with timestamp
 */
export const getCurrentExchangeRates = async (): Promise<{ rates: Record<string, number>; timestamp: string }> => {
  const rates = await getAllExchangeRates()
  return {
    rates,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Check if a currency is supported by our exchange rate service
 */
export const isCurrencySupported = async (currency: string): Promise<boolean> => {
  try {
    const rates = await getAllExchangeRates()
    return currency.toUpperCase() in rates
  } catch (error) {
    console.error(`Error checking if currency ${currency} is supported:`, error)
    return false
  }
}

/**
 * Get a list of all supported currencies
 */
export const getSupportedCurrencies = async (): Promise<string[]> => {
  try {
    const rates = await getAllExchangeRates()
    return Object.keys(rates)
  } catch (error) {
    console.error("Error getting supported currencies:", error)
    return []
  }
}

/**
 * Clear the exchange rate cache (useful for testing or forcing a refresh)
 */
export const clearExchangeRateCache = (): void => {
  rateCache.flushAll()
  console.log("Exchange rate cache cleared")
}
