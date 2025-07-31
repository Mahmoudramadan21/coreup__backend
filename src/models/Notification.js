const mongoose = require("mongoose");

/**
 * Notification Schema for user notifications
 * @module models/Notification
 */
const notificationSchema = new mongoose.Schema(
  {
    /**
     * ID of the user receiving the notification
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    /**
     * Type of notification (job, application, message, investment)
     */
    type: {
      type: String,
      enum: ["job", "application", "message", "investment"],
      required: [true, "Notification type is required"],
    },
    /**
     * Notification message content
     */
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
    },
    /**
     * URL link related to the notification
     */
    link: {
      type: String,
      trim: true,
    },
    /**
     * Indicates if the notification has been read
     */
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * Indexes for performance
 */
notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
