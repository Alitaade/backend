import axios from "axios"
import { getUsdToNgnRate, getUsdToRate } from "@/services/exchange-rate-service"
import { 
  PaystackPaymentResponse, 

} from "@/types/index"

// Paystack credentials
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_BASE_URL = "https://api.paystack.co"

/**
 * Initialize a payment with Paystack
 * @param params Payment initialization parameters
 * @returns Promise with payment initialization response
 */
export const initializePayment = async (
  orderId: string,
  amount: number,
  customerEmail: string,
  customerName: string,
  customerPhone: string,
  callbackUrl: string,
  currencyCode = "NGN", // Default to NGN since that's what Paystack primarily supports
  exchangeRate = 1,
  additionalMetadata = {},
): Promise<PaystackPaymentResponse> => {
  try {
    let formattedAmount = Math.round(amount * 100)
    let paymentCurrency = currencyCode
    let usedExchangeRate = exchangeRate
    let originalAmount = amount
    
    // For non-USD currencies, convert to USD equivalent first for proper tracking
    if (currencyCode !== "USD" && currencyCode !== "NGN") {
      // We need to first convert from the original currency to USD equivalent
      // We'll store this information in metadata for tracking
      console.log(`Original amount: ${amount} ${currencyCode}`)
      try {
        // We need to get the inverse of the rate for conversion to USD
        const currencyToUsdRate = 1 / await getUsdToRate(currencyCode)
        const usdEquivalent = amount * currencyToUsdRate
        console.log(`USD equivalent: ${usdEquivalent} USD (rate: ${currencyToUsdRate})`)
        
        // Store this for reference - original amount is now USD
        originalAmount = usdEquivalent
        
        // Add to metadata
        additionalMetadata = {
          ...additionalMetadata,
          original_currency_before_usd: currencyCode,
          original_amount_before_usd: amount,
          usd_conversion_rate: currencyToUsdRate
        }
      } catch (error) {
        console.warn(`Could not convert from ${currencyCode} to USD. Will attempt direct conversion to NGN.`, error)
      }
    }

    // Format the request according to Paystack's API documentation
    const reference = `ORDER-${orderId}-${Date.now()}`
    const payload = {
      email: customerEmail,
      amount: formattedAmount,
      currency: paymentCurrency,
      reference: reference,
      callback_url: callbackUrl,
      metadata: {
        order_id: orderId,
        customer_name: customerName,
        customer_phone: customerPhone || "N/A",
        original_currency: currencyCode,
        original_amount: amount,
        exchange_rate: usedExchangeRate,
        custom_fields: [
          {
            display_name: "Order Number",
            variable_name: "order_number",
            value: orderId,
          },
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: customerName,
          },
        ],
        ...additionalMetadata,
      },
    }

    console.log("Initializing payment with Paystack:", {
      email: payload.email,
      amount: payload.amount,
      currency: payload.currency,
      reference: payload.reference,
    })

    try {
      // Make the API request to initialize payment
      const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      })

      console.log("Paystack initialization response:", response.data)

      // Check if the request was successful
      if (response.data && response.data.status) {
        return {
          ...response.data,
          usedCurrency: paymentCurrency,
        }
      } else {
        throw new Error(response.data?.message || "Failed to initialize payment")
      }
    } catch (error: any) {
      console.error("Paystack payment initialization error:", error.response?.data || error.message)

      // Check if this is a currency not supported error
      if (
        error.response?.data?.message?.includes("Currency not supported") ||
        error.response?.data?.message?.includes("currency is not supported") ||
        error.response?.data?.message?.includes("Invalid currency") ||
        error.response?.data?.code === "unsupported_currency"
      ) {
        // If currency is not supported and it's not already NGN, try with NGN
        if (paymentCurrency !== "NGN") {
          console.log(`Currency ${paymentCurrency} not supported. Falling back to NGN...`)
          
          // Get NGN exchange rate if we don't have it or if it's the default value
          try {
            // If the original currency is USD, we just need the USD to NGN rate
            if (currencyCode === "USD") {
              usedExchangeRate = await getUsdToNgnRate()
              console.log(`Fetched USD to NGN exchange rate: ${usedExchangeRate}`)
            } 
            // If it's another currency (EUR, GBP, etc.), we need to properly calculate the NGN value
            else {
              try {
                // For other currencies, if we have a USD equivalent, use it
                if (additionalMetadata.usd_conversion_rate) {
                  // We already converted to USD equivalent above
                  const ngnRate = await getUsdToNgnRate()
                  usedExchangeRate = ngnRate
                  console.log(`Using USD equivalent to convert to NGN with rate: ${ngnRate}`)
                } else {
                  // Try direct conversion from source currency to NGN
                  // This is a fallback method
                  const sourceToUsdRate = 1 / await getUsdToRate(currencyCode)
                  const usdToNgnRate = await getUsdToNgnRate()
                  usedExchangeRate = sourceToUsdRate * usdToNgnRate
                  console.log(`Calculated ${currencyCode} to NGN rate: ${usedExchangeRate} (${currencyCode} → USD: ${sourceToUsdRate}, USD → NGN: ${usdToNgnRate})`)
                }
              } catch (conversionError) {
                console.error(`Error converting ${currencyCode} to NGN:`, conversionError)
                // If all else fails, try getting USD to NGN rate as a fallback
                usedExchangeRate = await getUsdToNgnRate()
                console.warn(`Using USD to NGN rate as fallback: ${usedExchangeRate}`)
              }
            }
            
            // Calculate amount in NGN
            const amountInNGN = originalAmount * usedExchangeRate
            formattedAmount = Math.round(amountInNGN * 100)
            
            console.log(`Converting ${originalAmount} ${currencyCode === "USD" ? "USD" : "USD equivalent"} to ${amountInNGN} NGN (${formattedAmount} kobo) with rate ${usedExchangeRate}`)
            
          } catch (rateError) {
            console.error("Error fetching exchange rates:", rateError)
            throw new Error("Could not fetch exchange rates for currency conversion")
          }
          
          // Update payload for NGN payment
          const ngnPayload = {
            ...payload,
            amount: formattedAmount,
            currency: "NGN",
            metadata: {
              ...payload.metadata,
              original_currency: currencyCode,
              used_currency: "NGN",
              exchange_rate: usedExchangeRate,
              fallback_to_ngn: true,
            },
          }
          
          try {
            // Try payment with NGN
            const ngnResponse = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, ngnPayload, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
              },
            })
            
            console.log("Paystack NGN fallback response:", ngnResponse.data)
            
            if (ngnResponse.data && ngnResponse.data.status) {
              return {
                ...ngnResponse.data,
                usedCurrency: "NGN",
                originalCurrency: currencyCode,
              }
            } else {
              throw new Error(ngnResponse.data?.message || "Failed to initialize payment with NGN fallback")
            }
          } catch (ngnError: any) {
            console.error("NGN fallback payment error:", ngnError.response?.data || ngnError.message)
            throw new Error("Failed to process payment with NGN fallback")
          }
        } else {
          // If we're already trying with NGN and it's not working, something else is wrong
          throw new Error(`Currency ${paymentCurrency} not supported by payment processor`)
        }
      }
      
      // Re-throw the original error if it's not a currency issue or if we couldn't handle it
      throw new Error(error.response?.data?.message || "Failed to initialize payment")
    }
  } catch (error: any) {
    console.error("Payment initialization error:", error)
    return {
      status: false,
      message: error.message || "Payment initialization failed",
    }
  }
}

/**
 * Verify a payment with Paystack
 */
export const verifyPayment = async (reference: string): Promise<any> => {
  try {
    console.log("Verifying payment with Paystack for reference:", reference)

    if (!PAYSTACK_SECRET_KEY) {
      console.error("PAYSTACK_SECRET_KEY is not set")
      throw new Error("Paystack secret key is not configured")
    }

    // Add retry logic for more reliability
    let retries = 3
    let lastError

    while (retries > 0) {
      try {
        const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
          timeout: 15000, // 15 second timeout
        })

        console.log("Paystack verification response status:", response.data.status)
        console.log("Paystack verification data status:", response.data.data?.status)

        // Log more details if payment was successful
        if (response.data.status && response.data.data?.status === "success") {
          console.log("Payment successful! Transaction details:", {
            amount: response.data.data.amount,
            currency: response.data.data.currency,
            transaction_date: response.data.data.transaction_date,
            reference: response.data.data.reference,
            metadata: response.data.data.metadata,
          })
        }

        return response.data
      } catch (error: any) {
        lastError = error
        console.error(`Paystack verification attempt ${3 - retries + 1} failed:`, error.message)
        retries--

        if (retries > 0) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (3 - retries)))
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error("Failed to verify payment after multiple attempts")
  } catch (error: any) {
    console.error("Paystack payment verification error:", error.response?.data || error.message)
    throw new Error(error.response?.data?.message || "Failed to verify payment")
  }
}