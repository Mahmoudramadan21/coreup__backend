const stripe = require("stripe");
const { sendResponse } = require("../utils/response");
const logger = require("../utils/logger");
const Payment = require("../models/Payment");

const stripeClient =
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== "sk_test_dummy_key_for_development"
    ? stripe(process.env.STRIPE_SECRET_KEY)
    : null;

/**
 * Create a payment intent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createPaymentIntent = async (req, res) => {
  try {
    if (!stripeClient) {
      return sendResponse(
        res,
        503,
        null,
        "Payment processing is currently unavailable"
      );
    }

    const { amount, currency = "usd" } = req.body;
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: { userId: req.user.id },
    });

    await Payment.create({
      userId: req.user.id,
      amount,
      currency,
      paymentIntentId: paymentIntent.id,
      status: "pending",
    });

    sendResponse(
      res,
      200,
      { clientSecret: paymentIntent.client_secret },
      "Payment intent created"
    );
  } catch (error) {
    logger.error(`Create payment intent error: ${error.message}`);
    sendResponse(res, 500, null, "Failed to create payment intent");
  }
};

/**
 * Confirm payment status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const confirmPayment = async (req, res) => {
  try {
    if (!stripeClient) {
      return sendResponse(
        res,
        503,
        null,
        "Payment processing is currently unavailable"
      );
    }

    const { paymentIntentId } = req.body;
    const paymentIntent = await stripeClient.paymentIntents.retrieve(
      paymentIntentId
    );

    const payment = await Payment.findOneAndUpdate(
      { paymentIntentId },
      { status: paymentIntent.status },
      { new: true }
    );

    if (!payment) {
      return sendResponse(res, 404, null, "Payment not found");
    }

    sendResponse(res, 200, payment, "Payment status updated");
  } catch (error) {
    logger.error(`Confirm payment error: ${error.message}`);
    sendResponse(res, 500, null, "Failed to confirm payment");
  }
};

module.exports = { createPaymentIntent, confirmPayment };
