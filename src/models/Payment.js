const mongoose = require("mongoose");

/**
 * Payment Schema for payment transactions
 * @module models/Payment
 */
const paymentSchema = new mongoose.Schema(
  {
    /**
     * ID of the user making the payment
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    /**
     * Payment amount
     */
    amount: {
      type: Number,
      min: 0,
      required: [true, "Amount is required"],
    },
    /**
     * Currency of the payment
     */
    currency: {
      type: String,
      default: "USD",
    },
    /**
     * Payment intent ID from payment gateway
     */
    paymentIntentId: {
      type: String,
      required: [true, "Payment intent ID is required"],
      trim: true,
    },
    /**
     * Payment status (pending, succeeded, failed)
     */
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

/**
 * Indexes for performance
 */
paymentSchema.index({ userId: 1 });
paymentSchema.index({ paymentIntentId: 1 });

module.exports = mongoose.model("Payment", paymentSchema);
