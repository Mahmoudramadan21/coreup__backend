const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, "Amount cannot be negative"],
      index: true,
    },
    currency: {
      type: String,
      enum: ["USD", "EUR", "GBP", "VCR"],
      default: "VCR",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique index with partial filter to allow new requests only if previous is rejected or expired
interactionSchema.index(
  { sender: 1, receiver: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "accepted"] } },
  }
);

interactionSchema.pre("save", async function (next) {
  if (this.sender.equals(this.receiver)) {
    return next(new Error("Cannot send interaction to yourself"));
  }
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model("Interaction", interactionSchema);
