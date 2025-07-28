const Notification = require("../models/Notification");
const { sendResponse } = require("../utils/response");

/**
 * Get user notifications
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    sendResponse(
      res,
      200,
      notifications,
      "Notifications retrieved successfully"
    );
  } catch (error) {
    sendResponse(res, 500, null, "Server error");
  }
};

/**
 * Mark notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return sendResponse(res, 404, null, "Notification not found");
    }
    sendResponse(res, 200, notification, "Notification marked as read");
  } catch (error) {
    sendResponse(res, 500, null, "Server error");
  }
};

/**
 * Create a notification (internal use)
 * @param {Object} params - Notification details
 */
const createNotification = async ({ userId, type, message, link }) => {
  try {
    const notification = new Notification({ userId, type, message, link });
    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};

module.exports = { getNotifications, markAsRead, createNotification };
