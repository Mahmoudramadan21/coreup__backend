/**
 * Send a standardized API response
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {Object|null} data - Response data
 * @param {string} message - Response message
 * @param {Object} [metadata] - Optional metadata (e.g., pagination info)
 */
const sendResponse = (res, status, data, message, metadata = {}) => {
  res.status(status).json({
    success: status < 400,
    data,
    message,
    ...metadata,
  });
};

module.exports = { sendResponse };
