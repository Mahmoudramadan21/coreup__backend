// models/Token.js
const mongoose = require("mongoose");

/**
 * Token Schema for password reset and refresh tokens
 * @module models/Token
 */
const tokenSchema = new mongoose.Schema(
  {
    /**
     * ID of the user associated with the token
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    /**
     * Token value (either reset token or refresh token)
     */
    token: {
      type: String,
      required: [true, "Token is required"],
    },
    /**
     * Type of token (reset or refresh)
     */
    type: {
      type: String,
      enum: ["reset", "refresh"],
      required: [true, "Token type is required"],
    },
    /**
     * Token expiration date
     */
    expires: {
      type: Date,
      required: [true, "Expiration date is required"],
    },
  },
  { timestamps: true }
);

/**
 * Indexes for performance and automatic expiration
 */
tokenSchema.index({ userId: 1, type: 1 });
tokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Token", tokenSchema);
