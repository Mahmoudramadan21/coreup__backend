const { body, param, validationResult } = require("express-validator");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { sendResponse } = require("../utils/response");
const logger = require("../utils/logger");
const { uploadToCloud } = require("../services/cloudService");

/**
 * Start a new conversation or retrieve an existing one
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.startConversation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, errors.array()[0].msg);
    }

    const { participantId } = req.body;
    const userId = req.user.id;

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] },
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [userId, participantId],
      });
      await conversation.save();
      logger.info(`Conversation created: ${conversation._id}`);
    }

    return sendResponse(
      res,
      200,
      conversation,
      "Conversation started successfully"
    );
  } catch (error) {
    logger.error(`Error starting conversation: ${error.message}`, error.stack);
    return sendResponse(res, 500, null, "Error starting conversation");
  }
};

/**
 * Send a message in a conversation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} io - Socket.IO instance
 */
exports.sendMessage = async (req, res, io) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, errors.array()[0].msg);
    }

    const { conversationId, content } = req.body;
    const senderId = req.user.id;
    const file = req.file;

    let attachment = null;
    if (file) {
      const uploadOptions = {
        folder: "chat_attachments",
        resource_type: file.mimetype.startsWith("image/") ? "image" : "raw",
      };
      const uploadResult = await uploadToCloud(
        file.buffer,
        uploadOptions,
        file.originalname
      );
      attachment = {
        url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        resource_type: uploadResult.resource_type,
      };
    }

    const message = new Message({
      conversationId,
      sender: senderId,
      content: content || "",
      attachment,
    });

    await message.save();

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: Date.now(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "firstName lastName userType profilePicture")
      .lean();

    if (io) {
      io.to(conversationId).emit("newMessage", populatedMessage);
      logger.info(
        `Message broadcasted to room ${conversationId} by user ${senderId}`
      );
    } else {
      logger.error(
        `io is undefined in sendMessage for conversation ${conversationId}`
      );
    }

    return sendResponse(
      res,
      201,
      populatedMessage,
      "Message sent successfully"
    );
  } catch (error) {
    logger.error(`Error sending message: ${error.message}`, error.stack);
    return sendResponse(res, 500, null, "Error sending message");
  }
};

/**
 * Retrieve messages for a conversation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getConversationMessages = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, errors.array()[0].msg);
    }

    const { conversationId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return sendResponse(
        res,
        403,
        null,
        "You are not authorized to view this conversation"
      );
    }

    const messages = await Message.find({ conversationId })
      .populate("sender", "firstName lastName userType profilePicture")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return sendResponse(res, 200, messages, "Messages retrieved successfully");
  } catch (error) {
    logger.error(`Error fetching messages: ${error.message}`, error.stack);
    return sendResponse(res, 500, null, "Error fetching messages");
  }
};

/**
 * Retrieve all conversations for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "firstName lastName userType profilePicture")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "firstName lastName userType profilePicture",
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    return sendResponse(
      res,
      200,
      conversations,
      "Conversations retrieved successfully"
    );
  } catch (error) {
    logger.error(`Error fetching conversations: ${error.message}`, error.stack);
    return sendResponse(res, 500, null, "Error fetching conversations");
  }
};

/**
 * Mark a message as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} io - Socket.IO instance
 */
exports.markMessageAsRead = async (req, res, io) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, errors.array()[0].msg);
    }

    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findOne({
      _id: messageId,
      conversationId: {
        $in: await Conversation.find({ participants: userId }).distinct("_id"),
      },
    });

    if (!message) {
      return sendResponse(
        res,
        403,
        null,
        "Message not found or you are not authorized"
      );
    }

    message.read = true;
    await message.save();

    io.to(message.conversationId.toString()).emit("messageRead", { messageId });
    logger.info(`Message ${messageId} marked as read by user ${userId}`);

    return sendResponse(res, 200, message, "Message marked as read");
  } catch (error) {
    logger.error(
      `Error marking message as read: ${error.message}`,
      error.stack
    );
    return sendResponse(res, 500, null, "Error marking message as read");
  }
};

// controllers/chatController.js

/**
 * Delete a conversation and its associated messages
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} io - Socket.IO instance
 */
exports.deleteConversation = async (req, res, io) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendResponse(res, 400, null, errors.array()[0].msg);
    }

    const { conversationId } = req.params;
    const userId = req.user.id;

    // Check if the conversation exists and the user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return sendResponse(
        res,
        403,
        null,
        "Conversation not found or you are not authorized"
      );
    }

    // Delete all messages associated with the conversation
    await Message.deleteMany({ conversationId });

    // Delete the conversation
    await Conversation.findByIdAndDelete(conversationId);

    // Optionally notify other participants via Socket.IO
    if (io) {
      io.to(conversationId).emit("conversationDeleted", { conversationId });
      logger.info(`Conversation ${conversationId} deleted by user ${userId}`);
    } else {
      logger.error(
        `io is undefined in deleteConversation for conversation ${conversationId}`
      );
    }

    return sendResponse(res, 200, null, "Conversation deleted successfully");
  } catch (error) {
    logger.error(`Error deleting conversation: ${error.message}`, error.stack);
    return sendResponse(res, 500, null, "Error deleting conversation");
  }
};
