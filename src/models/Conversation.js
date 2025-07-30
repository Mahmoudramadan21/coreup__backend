const mongoose = require("mongoose");

/**
 * Schema for conversations between users
 * @module models/Conversation
 */
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure efficient querying for conversations
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
