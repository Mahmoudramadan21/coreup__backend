const mongoose = require("mongoose");
const { User } = require("../models/User");
const Connection = require("../models/Connection");
const { sendResponse } = require("../utils/response");
const logger = require("../utils/logger");

const sendConnection = async (req, res) => {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user.id;

    const sender = await User.findById(senderId);
    if (!sender || sender.userType !== "investor") {
      return sendResponse(
        res,
        403,
        null,
        "Only investors can send connections"
      );
    }

    const receiver = await User.findById(receiverId);
    if (!receiver || receiver.userType !== "startup") {
      return sendResponse(res, 400, null, "Receiver must be a startup");
    }

    const existingConnection = await Connection.findOne({
      sender: senderId,
      receiver: receiverId,
    });
    if (existingConnection) {
      return sendResponse(
        res,
        400,
        null,
        `Connection already ${existingConnection.status}`
      );
    }

    const connection = new Connection({
      sender: senderId,
      receiver: receiverId,
    });
    await connection.save();

    logger.info("Connection sent:", { senderId, receiverId });

    sendResponse(res, 201, connection, "Connection request sent successfully");
  } catch (error) {
    logger.error("Send connection error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

const updateConnection = async (req, res) => {
  try {
    const { id: connectionId } = req.params;
    const { status } = req.body;
    const receiverId = req.user.id;

    if (!["accepted", "rejected"].includes(status)) {
      return sendResponse(res, 400, null, "Invalid status value");
    }

    const connection = await Connection.findOne({
      _id: connectionId,
      receiver: receiverId,
    }).populate("nudge");
    if (!connection) {
      return sendResponse(
        res,
        404,
        null,
        "Connection not found or unauthorized"
      );
    }

    if (connection.status !== "pending") {
      return sendResponse(res, 400, null, "Connection already processed");
    }

    connection.status = status;
    if (connection.nudge && status === "accepted") {
      connection.nudge.status = "accepted";
      await connection.nudge.save();
    }
    await connection.save();

    logger.info("Connection updated:", { connectionId, status });

    sendResponse(res, 200, connection, "Connection updated successfully");
  } catch (error) {
    logger.error("Update connection error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

const getConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    let connections;
    if (user.userType === "investor") {
      connections = await Connection.find({ sender: userId })
        .populate("receiver", "firstName lastName profilePicture")
        .populate("nudge")
        .lean();
    } else if (user.userType === "startup") {
      connections = await Connection.find({ receiver: userId })
        .populate("sender", "firstName lastName profilePicture")
        .populate("nudge")
        .lean();
    } else {
      return sendResponse(
        res,
        403,
        null,
        "Only investors and startups can view connections"
      );
    }

    logger.debug("Connections retrieved:", {
      userId,
      count: connections.length,
    });

    sendResponse(res, 200, connections, "Connections retrieved successfully");
  } catch (error) {
    logger.error("Get connections error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

module.exports = { sendConnection, updateConnection, getConnections };
