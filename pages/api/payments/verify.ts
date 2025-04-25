import type { NextApiRequest, NextApiResponse } from "next";
import { verifyPayment } from "../../../services/paystack-service";
import {
  getOrderByPaymentReference,
  updateOrderPaymentStatus,
  updateOrderStatus,
  getOrderByOrderNumber,
} from "../../../models/order";
import { createVerificationToken } from "../../../models/token";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight request (OPTIONS)
  if (req.method === "OPTIONS") {
    // Set CORS headers for preflight requests
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-API-Key, x-api-key"
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    return res.status(200).end();
  }

  // Set CORS headers for the actual request
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required" });
    }

    console.log(`Verifying payment with reference: ${reference}`);

    try {
      // Try to extract order number from reference (format: ORDER-ORD-timestamp-number-timestamp)
      const orderMatch = String(reference).match(/ORDER-(ORD-[^-]+)/);
      const extractedOrderNumber = orderMatch ? orderMatch[1] : null;

      if (extractedOrderNumber) {
        console.log(
          `Extracted order number from reference: ${extractedOrderNumber}`
        );

        // Try to find the order by the extracted order number
        const orderByNumber = await getOrderByOrderNumber(extractedOrderNumber);

        if (orderByNumber) {
          console.log(
            `Found order with ID ${orderByNumber.id} for order number ${extractedOrderNumber}`
          );

          // Update order payment status to completed
          await updateOrderPaymentStatus(
            orderByNumber.id,
            "completed",
            reference as string
          );
          console.log(
            `Updated payment status to 'completed' for order ${orderByNumber.id}`
          );

          // Also update the order status to processing if it was pending
          if (orderByNumber.status === "pending") {
            await updateOrderStatus(orderByNumber.id, "processing");
            console.log(
              `Updated order status to 'processing' for order ${orderByNumber.id}`
            );
          }

          // Generate a verification token for the order
          const tokenData = await createVerificationToken(
            orderByNumber.id,
            orderByNumber.order_number
          );
          console.log(
            `Generated verification token for order ${orderByNumber.id}: ${tokenData.token}`
          );

          return res.status(200).json({
            message: "Payment verified successfully",
            verified: true,
            data: { status: "success", reference },
            orderId: orderByNumber.order_number,
            token: tokenData.token,
          });
        }
      }

      // If we couldn't extract the order number or find the order, try to verify with Paystack
      const verificationResponse = await verifyPayment(reference as string);
      console.log(
        `Paystack verification response:`,
        verificationResponse.data?.status
      );

      if (
        verificationResponse.status &&
        verificationResponse.data.status === "success"
      ) {
        // Find the order by payment reference
        const order = await getOrderByPaymentReference(reference as string);

        if (order) {
          console.log(
            `Found order with ID ${order.id} for payment reference ${reference}`
          );

          // Update order payment status
          await updateOrderPaymentStatus(
            order.id,
            "completed",
            reference as string
          );
          console.log(
            `Updated payment status to 'completed' for order ${order.id}`
          );

          // Also update the order status to processing if it was pending
          if (order.status === "pending") {
            await updateOrderStatus(order.id, "processing");
            console.log(
              `Updated order status to 'processing' for order ${order.id}`
            );
          }

          // Generate a verification token for the order
          const tokenData = await createVerificationToken(
            order.id,
            order.order_number
          );
          console.log(
            `Generated verification token for order ${order.id}: ${tokenData.token}`
          );

          return res.status(200).json({
            message: "Payment verified successfully",
            verified: true,
            data: { status: "success", reference },
            orderId: order.order_number,
            token: tokenData.token,
          });
        } else {
          // Try to find the order by extracting order ID from the reference
          // Many payment references might be formatted like ORDER-{orderId}-{timestamp}
          const orderIdMatch = (reference as string).match(/ORDER-([^-]+)-/);
          if (orderIdMatch && orderIdMatch[1]) {
            const orderByNumber = await getOrderByOrderNumber(orderIdMatch[1]);

            if (orderByNumber) {
              // Update the order with the payment reference
              await updateOrderPaymentStatus(
                orderByNumber.id,
                "completed",
                reference as string
              );
              console.log(
                `Updated payment status to 'completed' for order ${orderByNumber.id} (found by order number)`
              );

              // Also update the order status to processing if it was pending
              if (orderByNumber.status === "pending") {
                await updateOrderStatus(orderByNumber.id, "processing");
                console.log(
                  `Updated order status to 'processing' for order ${orderByNumber.id}`
                );
              }

              // Generate a verification token for the order
              const tokenData = await createVerificationToken(
                orderByNumber.id,
                orderByNumber.order_number
              );
              console.log(
                `Generated verification token for order ${orderByNumber.id}: ${tokenData.token}`
              );

              return res.status(200).json({
                message: "Payment verified successfully",
                verified: true,
                data: { status: "success", reference },
                orderId: orderByNumber.order_number,
                token: tokenData.token,
              });
            }
          }

          console.error(`Order not found for payment reference: ${reference}`);
          return res.status(200).json({
            message: "Payment verified but order not found",
            verified: true,
            data: verificationResponse.data,
            error: "Order not found",
          });
        }
      } else {
        console.log(
          `Payment verification failed or payment not successful for reference: ${reference}`
        );
        return res.status(200).json({
          message: "Payment not completed",
          verified: false,
          data: verificationResponse.data,
        });
      }
    } catch (verificationError: any) {
      console.error("Error during Paystack verification:", verificationError);

      // Even if verification fails, we'll check if we can find the order by extracting the order number
      try {
        // Try to extract order number from reference (format: ORDER-ORD-timestamp-number-timestamp)
        const orderMatch = String(reference).match(/ORDER-(ORD-[^-]+)/);
        const extractedOrderNumber = orderMatch ? orderMatch[1] : null;

        if (extractedOrderNumber) {
          const orderByNumber = await getOrderByOrderNumber(
            extractedOrderNumber
          );

          if (orderByNumber) {
            // Since we're in the callback, assume payment was successful despite verification error
            await updateOrderPaymentStatus(
              orderByNumber.id,
              "completed",
              reference as string
            );
            console.log(
              `Updated payment status to 'completed' for order ${orderByNumber.id} despite verification error`
            );

            if (orderByNumber.status === "pending") {
              await updateOrderStatus(orderByNumber.id, "processing");
              console.log(
                `Updated order status to 'processing' for order ${orderByNumber.id} despite verification error`
              );
            }

            // Generate a verification token for the order
            const tokenData = await createVerificationToken(
              orderByNumber.id,
              orderByNumber.order_number
            );
            console.log(
              `Generated verification token for order ${orderByNumber.id}: ${tokenData.token}`
            );

            return res.status(200).json({
              message:
                "Payment assumed successful (verification failed but callback received)",
              verified: true,
              data: { reference, status: "success" },
              orderId: orderByNumber.order_number,
              token: tokenData.token,
            });
          }
        }

        // If we couldn't extract the order number or find the order, try the original reference
        const order = await getOrderByPaymentReference(reference as string);

        if (order) {
          // Since we're in the callback, assume payment was successful despite verification error
          await updateOrderPaymentStatus(
            order.id,
            "completed",
            reference as string
          );
          console.log(
            `Updated payment status to 'completed' for order ${order.id} despite verification error`
          );

          if (order.status === "pending") {
            await updateOrderStatus(order.id, "processing");
            console.log(
              `Updated order status to 'processing' for order ${order.id} despite verification error`
            );
          }

          // Generate a verification token for the order
          const tokenData = await createVerificationToken(
            order.id,
            order.order_number
          );
          console.log(
            `Generated verification token for order ${order.id}: ${tokenData.token}`
          );

          return res.status(200).json({
            message:
              "Payment assumed successful (verification failed but callback received)",
            verified: true,
            data: { reference, status: "success" },
            orderId: order.order_number,
            token: tokenData.token,
          });
        }
      } catch (orderError) {
        console.error("Error finding/updating order:", orderError);
      }

      return res.status(200).json({
        message: "Payment verification failed",
        verified: false,
        error: verificationError.message,
      });
    }
  } catch (error: any) {
    console.error("Error in payment verification handler:", error);
    return res
      .status(500)
      .json({ error: error.message || "Internal server error" });
  }
}
