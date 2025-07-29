const { sendResponse } = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Middleware to handle errors globally
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  logger.error(
    `${err.message} - ${req.method} ${req.url} - Stack: ${err.stack}`
  );

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return sendResponse(res, 400, null, errors);
  }

  if (err.name === "MongoServerError" && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendResponse(res, 400, null, `Duplicate value for ${field}`);
  }

  if (err.name === "CastError") {
    return sendResponse(res, 400, null, `Invalid ${err.path}: ${err.value}`);
  }

  if (err.name === "JsonWebTokenError") {
    return sendResponse(res, 401, null, "Invalid token");
  }

  sendResponse(res, 500, null, "Internal server error");
};

module.exports = errorHandler;
