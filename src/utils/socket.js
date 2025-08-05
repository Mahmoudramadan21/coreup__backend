const jwt = require("jsonwebtoken");
const logger = require("./logger");

// Utility function to parse cookies from the cookie header
const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    cookies[name] = value;
  });
  return cookies;
};

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      // Extract cookies from the handshake headers
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies.authToken;

      if (!token) {
        throw new Error("Authentication required: No token provided");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: decoded.id,
        userType: decoded.userType,
      };
      logger.info(
        `Socket authentication successful: userId=${decoded.id}, userType=${decoded.userType}`
      );
      next();
    } catch (error) {
      logger.error(
        `Socket authentication error: ${error.message}`,
        error.stack
      );
      if (error.name === "TokenExpiredError") {
        next(new Error("Authentication failed: Token expired"));
      } else if (error.name === "JsonWebTokenError") {
        next(new Error("Authentication failed: Invalid token"));
      } else {
        next(new Error("Authentication error"));
      }
    }
  });

  io.on("connection", (socket) => {
    logger.info(`User connected: ${socket.user.id}`);

    socket.on("joinConversation", (conversationId, callback) => {
      socket.join(conversationId);
      logger.info(
        `User ${socket.user.id} joined conversation ${conversationId}`
      );
      if (callback) callback({ status: "joined", conversationId });
      socket.emit("joined", { status: "success", conversationId });
    });

    socket.on("leaveConversation", (conversationId) => {
      socket.leave(conversationId);
      logger.info(`User ${socket.user.id} left conversation ${conversationId}`);
    });

    socket.on("newMessage", (message) => {
      logger.info(
        `New message received in room ${message.conversationId} by ${socket.user.id}`,
        message
      );
      if (
        message.conversationId &&
        io.sockets.adapter.rooms.has(message.conversationId)
      ) {
        io.to(message.conversationId).emit("newMessage", message);
        logger.info(`Message broadcasted to room ${message.conversationId}`);
      } else {
        logger.warn(
          `No room found for conversationId: ${message.conversationId}`
        );
      }
    });

    socket.on("messageRead", ({ messageId }) => {
      logger.info(`Message ${messageId} marked as read by ${socket.user.id}`);
      io.to(socket.rooms).emit("messageRead", { messageId });
    });

    // Handle conversation deletion
    socket.on("conversationDeleted", ({ conversationId }) => {
      socket.to(conversationId).emit("conversationDeleted", { conversationId });
    });

    socket.on("disconnect", () => {
      logger.info(`User disconnected: ${socket.user.id}`);
    });
  });
};

module.exports = { setupSocket };
