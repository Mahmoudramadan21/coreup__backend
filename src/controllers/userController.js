const mongoose = require("mongoose");
const { User, Jobseeker, Investor, Startup } = require("../models/User");
const { sendResponse } = require("../utils/response");
const { uploadToCloud } = require("../services/cloudService");
const fs = require("fs").promises;
const logger = require("../utils/logger");

const countryFlagMap = {
  EGYPT: "🇪🇬",
  USA: "🇺🇸",
  UK: "🇬🇧",
};

/**
 * Update user profile
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with updated user data
 */
const updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      birthdate,
      gender,
      nationality,
      location,
      profile,
    } = req.body;
    let user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    // Update common fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phone = phone || user.phone;
    user.birthdate = birthdate || user.birthdate;
    user.gender = gender || user.gender;
    user.nationality = nationality || user.nationality;
    user.location = location || user.location;

    // Handle type-specific profile updates
    if (profile) {
      if (user.userType === "jobseeker") {
        const jobseeker = await Jobseeker.findById(req.user.id);
        if (profile.jobseeker) {
          jobseeker.profile.jobseeker = {
            ...jobseeker.profile.jobseeker,
            ...profile.jobseeker,
          };
          await jobseeker.save();
        }
      } else if (user.userType === "investor") {
        const investor = await Investor.findById(req.user.id);
        if (profile.investor) {
          investor.profile.investor = {
            ...investor.profile.investor,
            ...profile.investor,
          };
          await investor.save();
        }
      } else if (user.userType === "startup") {
        const startup = await Startup.findById(req.user.id);
        if (profile.startup) {
          const pitchDeckFile = req.file;
          if (pitchDeckFile) {
            const pitchBuffer = await fs.readFile(pitchDeckFile.path);
            const pitchOptions = {
              folder: "startups/pitch-decks",
              allowed_formats: ["pdf", "ppt", "pptx"],
              resource_type: "raw",
            };
            const pitchResult = await uploadToCloud(pitchBuffer, pitchOptions);
            await fs.unlink(pitchDeckFile.path);
            startup.profile.startup.pitchDeck = pitchResult.secure_url;
          }
          startup.profile.startup = {
            ...startup.profile.startup,
            ...profile.startup,
          };
          await startup.save();
        }
      }
    }

    await user.save();
    const updatedUser = await User.findById(user._id)
      .select("-password")
      .lean();
    sendResponse(res, 200, updatedUser, "Profile updated successfully");
  } catch (error) {
    logger.error("Update profile error:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return sendResponse(res, 400, null, `Validation failed: ${errors}`);
    }
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

/**
 * Get user profile
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with user profile data
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      return sendResponse(res, 404, null, "user profile not found");
    }

    // Merge user and user data, keeping all user profile fields
    const userData = {
      ...user, // Include all user fields except password
      profile: user.profile || {}, // Include full user profile
    };

    logger.info("user data retrieved:", {
      userId: user._id,
      email: user.email,
    });

    sendResponse(res, 200, userData, "user data retrieved successfully");
  } catch (error) {
    logger.error("Get profile error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

/**
 * Predict startup success
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with success prediction
 */
const predictSuccess = async (req, res) => {
  try {
    const startup = await Startup.findById(req.user.id);
    if (!startup) {
      return sendResponse(res, 404, null, "Startup profile not found");
    }
    const score = Math.floor(Math.random() * 100); // TODO: Replace with ML model
    startup.profile.startup.successPrediction = {
      score,
      details: "Based on industry and stage analysis",
    };
    await startup.save();
    sendResponse(
      res,
      200,
      startup.profile.startup.successPrediction,
      "Success prediction generated"
    );
  } catch (error) {
    logger.error("Predict success error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

/**
 * Get investor by ID
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with investor data
 */
const getInvestorById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return sendResponse(res, 400, null, "Invalid user ID");
    }

    // Find user and ensure they are an investor
    const user = await User.findById(id).select("-password").lean();
    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }
    if (user.userType !== "investor") {
      return sendResponse(res, 403, null, "User is not an investor");
    }

    // Fetch full investor data
    const investor = await Investor.findById(id).select("-password").lean();
    if (!investor) {
      return sendResponse(res, 404, null, "Investor profile not found");
    }

    // Merge user and investor data, keeping all investor profile fields
    const investorData = {
      ...user, // Include all user fields except password
      profile: investor.profile || {}, // Include full investor profile
    };

    logger.info("Investor data retrieved:", {
      userId: user._id,
      email: user.email,
    });

    sendResponse(
      res,
      200,
      investorData,
      "Investor data retrieved successfully"
    );
  } catch (error) {
    logger.error("Get investor by ID error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Delete user account
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response confirming account deletion
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.isValidObjectId(userId)) {
      return sendResponse(res, 400, null, "Invalid user ID");
    }

    // Find and delete the user
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    logger.info("User account deleted:", { userId });

    sendResponse(res, 200, null, "Account deleted successfully");
  } catch (error) {
    logger.error("Delete account error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

module.exports = {
  updateProfile,
  getProfile,
  predictSuccess,
  getInvestorById,
  deleteAccount,
};
