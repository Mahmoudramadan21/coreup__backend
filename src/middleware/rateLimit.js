const rateLimit = require("express-rate-limit");

const authRateLimiter = rateLimit({
  // windowMs: 260 * 60 * 1000, // 260 minutes
  // max: 2600, // Limit each IP to 100 requests per windowMs
  // message: "Too many requests, please try again later.",
});

module.exports = { authRateLimiter };
