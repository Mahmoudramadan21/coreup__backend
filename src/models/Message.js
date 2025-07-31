const mongoose = require("mongoose");

/**
 * Schema for messages within a conversation
 * @module models/Message
 */
const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [2000, "Message content cannot exceed 2000 characters"],
    },
    attachment: {
      type: {
        url: { type: String, trim: true },
        public_id: { type: String, trim: true },
        resource_type: { type: String, enum: ["image", "raw"] },
      },
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure efficient querying for messages
messageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
