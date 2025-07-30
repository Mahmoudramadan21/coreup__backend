const mongoose = require("mongoose");

/**
 * Contact Schema for contact form submissions
 * @module models/Contact
 */
const contactSchema = new mongoose.Schema(
  {
    /**
     * First name of the contact
     */
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    /**
     * Last name of the contact
     */
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    /**
     * Email address of the contact
     */
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    /**
     * Phone number of the contact
     */
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[1-9]\d{1,14}$/, "Please provide a valid phone number"],
    },
    /**
     * Message content
     */
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    /**
     * URL of an optional attachment
     */
    attachment: {
      type: String,
      trim: true,
    },
    /**
     * Status of the contact submission (open, resolved)
     */
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },
  },
  { timestamps: true }
);

/**
 * Indexes for performance
 */
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });

module.exports = mongoose.model("Contact", contactSchema);
