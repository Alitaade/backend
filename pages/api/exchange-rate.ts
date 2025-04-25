import type { NextApiRequest, NextApiResponse } from "next"
import {
  getCurrentExchangeRates,
  getUsdToRate,
  getSupportedCurrencies,
  isCurrencySupported,
} from "../../services/exchange-rate-service"
import { applyApiSecurity } from "../../middleware/api-security"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply security middleware
  return new Promise<void>((resolve) => {
    applyApiSecurity(req, res, async () => {
      try {
        // Only allow GET method
        if (req.method !== "GET") {
          res.status(405).json({ error: "Method not allowed" })
          return resolve()
        }

        // Get specific currency if requested
        const { currency } = req.query

        if (currency) {
          // Get rate for specific currency
          try {
            // Check if currency is supported
            const supported = await isCurrencySupported(currency as string)
            if (!supported) {
              res.status(400).json({
                success: false,
                error: `Currency ${currency} is not supported`,
              })
              return resolve()
            }

            const rate = await getUsdToRate(currency as string)
            res.status(200).json({
              success: true,
              currency: {
                from: "USD",
                to: currency,
              },
              rate,
              timestamp: new Date().toISOString(),
            })
          } catch (error) {
            console.error(`Error fetching rate for ${currency}:`, error)
            res.status(400).json({
              success: false,
              error: `Failed to fetch exchange rate for ${currency}`,
            })
          }
        } else {
          // Get all exchange rates
          try {
            const { rates, timestamp } = await getCurrentExchangeRates()
            const supportedCurrencies = await getSupportedCurrencies()

            res.status(200).json({
              success: true,
              rates,
              timestamp,
              supportedCurrencies,
            })
          } catch (error) {
            console.error("Error fetching exchange rates:", error)
            res.status(500).json({
              success: false,
              error: "Failed to fetch exchange rates",
            })
          }
        }
      } catch (error) {
        console.error("Unexpected error in exchange rate API:", error)
        res.status(500).json({
          success: false,
          error: "Internal server error",
        })
      }
      resolve()
    })
  })
}
