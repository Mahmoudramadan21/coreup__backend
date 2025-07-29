// middleware/auth.js
const jwt = require("jsonwebtoken");
const { User } = require("../models/User");
const { sendResponse } = require("../utils/response");

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.authToken;
    if (!token) {
      return sendResponse(
        res,
        401,
        null,
        "Authentication required: No token provided"
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return sendResponse(
          res,
          401,
          null,
          "Authentication failed: Token expired"
        );
      }
      if (error.name === "JsonWebTokenError") {
        return sendResponse(
          res,
          401,
          null,
          "Authentication failed: Invalid token"
        );
      }
      throw error;
    }

    const user = await User.findById(decoded.id).select(
      "userType firstName lastName"
    );
    if (!user) {
      return sendResponse(
        res,
        401,
        null,
        "Authentication failed: User not found"
      );
    }

    req.user = {
      id: decoded.id,
      userType: user.userType,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message, error.stack);
    sendResponse(res, 401, null, "Authentication failed: Invalid token");
  }
};

const restrictTo = (allowedTypes) => (req, res, next) => {
  if (!req.user || !allowedTypes.includes(req.user.userType)) {
    return sendResponse(
      res,
      403,
      null,
      `Access restricted to ${allowedTypes.join(", ")}`
    );
  }
  next();
};

module.exports = { auth, restrictTo };
