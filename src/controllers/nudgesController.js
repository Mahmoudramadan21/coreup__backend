const mongoose = require("mongoose");
const { User } = require("../models/User");
const Nudge = require("../models/Nudge");
const Connection = require("../models/Connection");
const { sendResponse } = require("../utils/response");
const logger = require("../utils/logger");

const NUDGE_PRICES = {
  10: 50,
  25: 100,
  50: 180,
};

const sendNudge = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user.id;

    const sender = await User.findById(senderId);
    if (!sender || sender.userType !== "startup") {
      return sendResponse(res, 403, null, "Only startups can send nudges");
    }

    const receiver = await User.findById(receiverId);
    if (!receiver || receiver.userType !== "investor") {
      return sendResponse(res, 400, null, "Receiver must be an investor");
    }

    if (sender.nudgeUsage >= sender.nudgeLimit) {
      return sendResponse(res, 400, null, "Nudge limit reached");
    }

    const existingConnection = await Connection.findOne({
      sender: senderId,
      receiver: receiverId,
    });
    if (!existingConnection) {
      const connection = new Connection({
        sender: senderId,
        receiver: receiverId,
      });
      await connection.save();
    } else if (existingConnection.status === "rejected") {
      return sendResponse(res, 400, null, "Cannot nudge a rejected connection");
    }

    const connection =
      existingConnection ||
      (await Connection.findOne({ sender: senderId, receiver: receiverId }));

    const nudge = new Nudge({
      sender: senderId,
      receiver: receiverId,
      amount: 0,
      currency: "VCR",
      connection: connection._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await nudge.save();

    connection.nudge = nudge._id;
    await connection.save();

    sender.nudgeUsage += 1;
    await sender.save();

    logger.info("Nudge and connection sent:", { senderId, receiverId });

    sendResponse(res, 201, nudge, "Nudge and connection sent successfully");
  } catch (error) {
    logger.error("Send nudge error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

const updateNudge = async (req, res) => {
  try {
    const { id: nudgeId } = req.params;
    const { status } = req.body;
    const receiverId = req.user.id;

    if (!["accepted", "rejected", "expired"].includes(status)) {
      return sendResponse(res, 400, null, "Invalid status value");
    }

    const nudge = await Nudge.findOne({
      _id: nudgeId,
      receiver: receiverId,
    }).populate("connection");
    if (!nudge) {
      return sendResponse(res, 404, null, "Nudge not found or unauthorized");
    }

    if (nudge.status !== "pending") {
      return sendResponse(res, 400, null, "Nudge already processed");
    }

    nudge.status = status;
    if (nudge.connection && status === "accepted") {
      nudge.connection.status = "accepted";
      await nudge.connection.save();
    }
    await nudge.save();

    logger.info("Nudge updated:", { nudgeId, status });

    sendResponse(res, 200, nudge, "Nudge updated successfully");
  } catch (error) {
    logger.error("Update nudge error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

const getNudgesSentToStartup = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user || user.userType !== "startup") {
      return sendResponse(
        res,
        403,
        null,
        "Only startups can view received nudges"
      );
    }

    const nudges = await Nudge.find({ receiver: userId })
      .populate("sender", "firstName lastName profilePicture")
      .populate("connection")
      .lean();

    logger.debug("Nudges received retrieved:", {
      userId,
      count: nudges.length,
    });

    sendResponse(res, 200, nudges, "Received nudges retrieved successfully");
  } catch (error) {
    logger.error("Get nudges received error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

const buyNudges = async (req, res) => {
  try {
    const { quantity } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user || user.userType !== "startup") {
      return sendResponse(res, 403, null, "Only startups can buy nudges");
    }

    const cost = NUDGE_PRICES[quantity] || 50;
    if (!cost || ![10, 25, 50].includes(quantity)) {
      return sendResponse(res, 400, null, "Invalid nudge quantity");
    }

    user.nudgeLimit += quantity;
    await user.save();

    logger.info("Nudges purchased:", { userId, quantity, cost });

    sendResponse(
      res,
      200,
      { nudgeLimit: user.nudgeLimit },
      "Nudges purchased successfully"
    );
  } catch (error) {
    logger.error("Buy nudges error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

const getInvestorNudgeAndConnectionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user || user.userType !== "investor") {
      return sendResponse(
        res,
        403,
        null,
        "Only investors can view nudge and connection history"
      );
    }

    const nudges = await Nudge.find({ sender: userId })
      .populate("receiver", "firstName lastName profilePicture")
      .populate("connection")
      .lean();

    const connections = await Connection.find({ sender: userId })
      .populate("receiver", "firstName lastName profilePicture")
      .populate("nudge")
      .lean();

    logger.debug("Nudge and connection history retrieved:", {
      userId,
      nudgeCount: nudges.length,
      connectionCount: connections.length,
    });

    sendResponse(
      res,
      200,
      { nudges, connections },
      "History retrieved successfully"
    );
  } catch (error) {
    logger.error("Get history error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

module.exports = {
  sendNudge,
  updateNudge,
  getNudgesSentToStartup,
  buyNudges,
  getInvestorNudgeAndConnectionHistory,
};
