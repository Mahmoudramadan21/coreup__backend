const mongoose = require("mongoose");
const { User, Jobseeker, Investor, Startup } = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendResponse } = require("../utils/response");
const { uploadToCloud } = require("../services/cloudService");
const fs = require("fs").promises;
const logger = require("../utils/logger");
const Token = require("../models/Token");
const { sendResetEmail } = require("../services/emailService");
const crypto = require("crypto");

const countryFlagMap = {
  EGYPT: "🇪🇬",
  USA: "🇺🇸",
  UK: "🇬🇧",
};

const parseJsonField = (value, fieldName) => {
  if (typeof value === "string") {
    try {
      const cleanedValue = value.trim();
      // Check if the value is a valid JSON string (object or array)
      if (
        (cleanedValue.startsWith("{") && cleanedValue.endsWith("}")) ||
        (cleanedValue.startsWith("[") && cleanedValue.endsWith("]"))
      ) {
        const parsed = JSON.parse(cleanedValue);
        if (parsed && (typeof parsed === "object" || Array.isArray(parsed))) {
          return parsed;
        }
      }
      logger.warn(`Invalid ${fieldName} format after parsing:`, {
        value: cleanedValue,
      });
      return fieldName === "team" ? [] : {}; // Return empty array for team, empty object for others
    } catch (e) {
      logger.error(`Failed to parse ${fieldName}:`, {
        value,
        error: e.message,
      });
      return fieldName === "team" ? [] : {}; // Return empty array for team, empty object for others
    }
  }
  return value || (fieldName === "team" ? [] : {}); // Return value as is or empty array/object based on field
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
};

/**
 * Set authentication and refresh tokens in cookies
 * @function
 * @async
 * @param {Object} res - Express response object
 * @param {string} userId - ID of the user
 * @param {string} userType - Type of the user (jobseeker, investor, startup)
 * @return {Promise<void>} Sets cookies with tokens
 */
const setTokensInCookies = async (res, userId, userType) => {
  const authToken = jwt.sign({ id: userId, userType }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  const refreshToken = crypto.randomBytes(32).toString("hex");
  const refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Token.create({
    userId,
    token: refreshToken,
    type: "refresh",
    expires: refreshTokenExpires,
  });

  res.cookie("authToken", authToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

/**
 * Register a new user with basic information
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with user data and JWT token
 */
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, userType } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return sendResponse(res, 400, null, "User already exists");
    }

    const userData = {
      firstName,
      lastName,
      email,
      password,
      userType,
    };

    logger.info("User data before save:", userData);

    const user = new User(userData);
    await user.save();

    // إرسال الكوكيز بدل الـ token في الـ response body
    await setTokensInCookies(res, user._id, user.userType);

    sendResponse(
      res,
      201,
      {
        user: {
          id: user._id,
          email,
          userType,
        },
      },
      "User registered successfully"
    );
  } catch (error) {
    logger.error("Registration error:", {
      message: error.message,
      stack: error.stack,
      userData: req.body,
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
 * Update jobseeker details
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with updated user data
 */
const registerJobseekerDetails = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      gender,
      birthdate,
      nationality,
      location,
      phone,
      profile,
    } = req.body;

    // Validate gender if provided
    if (gender) {
      const validGenders = ["male", "female", "other", "preferNotToSay"];
      if (!validGenders.includes(gender)) {
        return sendResponse(
          res,
          400,
          null,
          `Gender must be one of: ${validGenders.join(", ")}`
        );
      }
    }

    let user = await User.findById(req.user.id);
    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    logger.info("Request files:", {
      profilePicture: req.files?.profilePicture,
      coverPicture: req.files?.coverPicture,
    });

    let profilePictureUrl = null;
    let profilePicturePublicId = null;
    if (req.files && req.files.profilePicture && req.files.profilePicture[0]) {
      const profilePictureFile = req.files.profilePicture[0];
      logger.info("Uploading profile picture:", {
        originalname: profilePictureFile.originalname,
        mimetype: profilePictureFile.mimetype,
        size: profilePictureFile.size,
      });
      const profileUploadOptions = {
        folder: "profile_pictures",
        resource_type: "image",
        allowed_formats: ["jpeg", "jpg", "png"],
      };
      const profileUploadResult = await uploadToCloud(
        profilePictureFile.buffer,
        profileUploadOptions,
        profilePictureFile.originalname
      );
      profilePictureUrl = profileUploadResult.secure_url;
      profilePicturePublicId = profileUploadResult.public_id;
    }

    let coverPictureUrl = null;
    let coverPicturePublicId = null;
    if (req.files && req.files.coverPicture && req.files.coverPicture[0]) {
      const coverPictureFile = req.files.coverPicture[0];
      logger.info("Uploading cover picture:", {
        originalname: coverPictureFile.originalname,
        mimetype: coverPictureFile.mimetype,
        size: coverPictureFile.size,
      });
      const coverUploadOptions = {
        folder: "cover_pictures",
        resource_type: "image",
        allowed_formats: ["jpeg", "jpg", "png"],
      };
      const coverUploadResult = await uploadToCloud(
        coverPictureFile.buffer,
        coverUploadOptions,
        coverPictureFile.originalname
      );
      coverPictureUrl = coverUploadResult.secure_url;
      coverPicturePublicId = coverUploadResult.public_id;
    }

    // Build updateData dynamically based on provided fields
    const updateData = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (gender) updateData.gender = gender;
    if (birthdate)
      updateData.birthdate = parseJsonField(birthdate, "birthdate");
    if (nationality) updateData.nationality = nationality.trim();
    if (location) updateData.location = parseJsonField(location, "location");
    if (phone) updateData.phone = phone.trim();
    if (profile) {
      const parsedProfile = parseJsonField(profile, "profile");
      updateData["profile.jobseeker"] = {
        yearsOfExperience:
          parsedProfile.jobseeker?.yearsOfExperience ??
          user.profile.jobseeker?.yearsOfExperience ??
          0,
        education:
          parsedProfile.jobseeker?.education ??
          user.profile.jobseeker?.education ??
          [],
        experiences:
          parsedProfile.jobseeker?.experiences ??
          user.profile.jobseeker?.experiences ??
          [],
        skills:
          parsedProfile.jobseeker?.skills ??
          user.profile.jobseeker?.skills ??
          [],
      };
    }
    if (profilePictureUrl) updateData.profilePicture = profilePictureUrl;
    if (profilePicturePublicId)
      updateData.profilePicturePublicId = profilePicturePublicId;
    if (coverPictureUrl) updateData.coverPicture = coverPictureUrl;
    if (coverPicturePublicId)
      updateData.coverPicturePublicId = coverPicturePublicId;

    // Only update if at least one field is provided
    if (Object.keys(updateData).length === 0) {
      return sendResponse(res, 400, null, "No fields provided for update");
    }

    logger.info("Update data before applying:", updateData);

    await User.updateOne(
      { _id: user._id },
      { $set: updateData },
      { runValidators: true }
    );

    const savedUser = await User.findById(user._id);
    logger.info("User document after update:", {
      _id: savedUser._id,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      gender: savedUser.gender,
      profilePicture: savedUser.profilePicture,
      profilePicturePublicId: savedUser.profilePicturePublicId,
      coverPicture: savedUser.coverPicture,
      coverPicturePublicId: savedUser.coverPicturePublicId,
      profile: savedUser.profile,
      birthdate: savedUser.birthdate,
      nationality: savedUser.nationality,
      location: savedUser.location,
      phone: savedUser.phone,
    });

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .lean();
    sendResponse(
      res,
      200,
      updatedUser,
      "Jobseeker details updated successfully"
    );
  } catch (error) {
    logger.error("Update jobseeker details error:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return sendResponse(res, 400, null, `Validation failed: ${errors}`);
    }
    return sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Register investor details
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with updated user data
 */
const registerInvestorDetails = async (req, res) => {
  try {
    const { bio, investmentCriteria } = req.body;

    let user = await User.findById(req.user.id);
    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    logger.info("Request files:", {
      profilePicture: req.files?.profilePicture,
      coverPicture: req.files?.coverPicture,
    });

    let profilePictureUrl = null;
    let profilePicturePublicId = null;
    if (req.files && req.files.profilePicture && req.files.profilePicture[0]) {
      const profilePictureFile = req.files.profilePicture[0];
      logger.info("Uploading profile picture:", {
        originalname: profilePictureFile.originalname,
        mimetype: profilePictureFile.mimetype,
        size: profilePictureFile.size,
      });
      const profileUploadOptions = {
        folder: "profile_pictures",
        resource_type: "image",
        allowed_formats: ["jpeg", "jpg", "png"],
      };
      const profileUploadResult = await uploadToCloud(
        profilePictureFile.buffer,
        profileUploadOptions,
        profilePictureFile.originalname
      );
      profilePictureUrl = profileUploadResult.secure_url;
      profilePicturePublicId = profileUploadResult.public_id;
    } else {
      logger.error("Profile picture missing in request");
      return sendResponse(res, 400, null, "Profile picture is required");
    }

    let coverPictureUrl = null;
    let coverPicturePublicId = null;
    if (req.files && req.files.coverPicture && req.files.coverPicture[0]) {
      const coverPictureFile = req.files.coverPicture[0];
      logger.info("Uploading cover picture:", {
        originalname: coverPictureFile.originalname,
        mimetype: coverPictureFile.mimetype,
        size: coverPictureFile.size,
      });
      const coverUploadOptions = {
        folder: "cover_pictures",
        resource_type: "image",
        allowed_formats: ["jpeg", "jpg", "png"],
      };
      const coverUploadResult = await uploadToCloud(
        coverPictureFile.buffer,
        coverUploadOptions,
        coverPictureFile.originalname
      );
      coverPictureUrl = coverUploadResult.secure_url;
      coverPicturePublicId = coverUploadResult.public_id;
    } else {
      logger.error("Cover picture missing in request");
      return sendResponse(res, 400, null, "Cover picture is required");
    }

    const parsedInvestmentCriteria = parseJsonField(
      investmentCriteria,
      "investmentCriteria"
    );

    const updateData = {
      "profile.investor": {
        bio,
        investmentCriteria: parsedInvestmentCriteria,
      },
      profilePicture: profilePictureUrl,
      profilePicturePublicId: profilePicturePublicId,
      coverPicture: coverPictureUrl,
      coverPicturePublicId: coverPicturePublicId,
    };

    logger.info("Update data before applying:", updateData);

    await User.updateOne(
      { _id: user._id },
      { $set: updateData },
      { runValidators: true }
    );

    const savedUser = await User.findById(user._id);
    logger.info("User document after update:", {
      _id: savedUser._id,
      profilePicture: savedUser.profilePicture,
      profilePicturePublicId: savedUser.profilePicturePublicId,
      coverPicture: savedUser.coverPicture,
      coverPicturePublicId: savedUser.coverPicturePublicId,
      profile: savedUser.profile,
    });

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .lean();
    sendResponse(
      res,
      200,
      updatedUser,
      "Investor details registered successfully"
    );
  } catch (error) {
    logger.error("Register investor details error:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return sendResponse(res, 400, null, `Validation failed: ${errors}`);
    }
    return sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Edit startup details
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with updated user data
 */
const editStartupDetails = async (req, res) => {
  try {
    const {
      pitchTitle,
      website,
      mobileNumber,
      industry1,
      industry2,
      stage,
      idealInvestorRole,
      fundingGoal,
      amountRaised,
      minInvestmentPerInvestor,
      previousFunding,
      team,
      description,
      location,
    } = req.body;

    let user = await User.findById(req.user.id);
    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    logger.info("Request files:", {
      profilePicture: req.files?.profilePicture,
      coverPicture: req.files?.coverPicture,
      pitchDeck: req.files?.pitchDeck,
    });

    // Initialize with existing values
    let profilePictureUrl = user.profilePicture;
    let profilePicturePublicId = user.profilePicturePublicId;
    if (req.files && req.files.profilePicture && req.files.profilePicture[0]) {
      const profilePictureFile = req.files.profilePicture[0];
      logger.info("Uploading profile picture:", {
        originalname: profilePictureFile.originalname,
        mimetype: profilePictureFile.mimetype,
        size: profilePictureFile.size,
      });
      const profileUploadOptions = {
        folder: "profile_pictures",
        resource_type: "image",
        allowed_formats: ["jpeg", "jpg", "png"],
      };
      const profileUploadResult = await uploadToCloud(
        profilePictureFile.buffer,
        profileUploadOptions,
        profilePictureFile.originalname
      );
      profilePictureUrl = profileUploadResult.secure_url;
      profilePicturePublicId = profileUploadResult.public_id;
    }

    let coverPictureUrl = user.coverPicture;
    let coverPicturePublicId = user.coverPicturePublicId;
    if (req.files && req.files.coverPicture && req.files.coverPicture[0]) {
      const coverPictureFile = req.files.coverPicture[0];
      logger.info("Uploading cover picture:", {
        originalname: coverPictureFile.originalname,
        mimetype: coverPictureFile.mimetype,
        size: coverPictureFile.size,
      });
      const coverUploadOptions = {
        folder: "cover_pictures",
        resource_type: "image",
        allowed_formats: ["jpeg", "jpg", "png"],
      };
      const coverUploadResult = await uploadToCloud(
        coverPictureFile.buffer,
        coverUploadOptions,
        coverPictureFile.originalname
      );
      coverPictureUrl = coverUploadResult.secure_url;
      coverPicturePublicId = coverUploadResult.public_id;
    }

    let pitchDeckUrl = user.profile.startup?.pitchDeck;
    let pitchDeckPublicId = user.profile.startup?.pitchDeckPublicId;
    if (req.files && req.files.pitchDeck && req.files.pitchDeck[0]) {
      const pitchDeckFile = req.files.pitchDeck[0];
      logger.info("Uploading pitch deck:", {
        originalname: pitchDeckFile.originalname,
        mimetype: pitchDeckFile.mimetype,
        size: pitchDeckFile.size,
      });
      const pitchUploadOptions = {
        folder: "startups/pitch-decks",
        resource_type: "raw",
        allowed_formats: ["pdf", "ppt", "pptx"],
      };
      const pitchUploadResult = await uploadToCloud(
        pitchDeckFile.buffer,
        pitchUploadOptions,
        pitchDeckFile.originalname
      );
      pitchDeckUrl = pitchUploadResult.secure_url;
      pitchDeckPublicId = pitchUploadResult.public_id;
    }

    const parsedFundingGoal = parseJsonField(fundingGoal, "fundingGoal");
    const parsedTeam = parseJsonField(team, "team");
    const parsedLocation = parseJsonField(location, "location");

    const updateData = {
      "profile.startup": {
        pitchTitle: pitchTitle || user.profile.startup?.pitchTitle,
        website: website || user.profile.startup?.website,
        mobileNumber: mobileNumber || user.profile.startup?.mobileNumber,
        industry1: industry1 || user.profile.startup?.industry1,
        industry2: industry2 || user.profile.startup?.industry2,
        stage: stage || user.profile.startup?.stage,
        idealInvestorRole:
          idealInvestorRole || user.profile.startup?.idealInvestorRole,
        fundingGoal: parsedFundingGoal || user.profile.startup?.fundingGoal,
        amountRaised: amountRaised || user.profile.startup?.amountRaised,
        minInvestmentPerInvestor:
          minInvestmentPerInvestor ||
          user.profile.startup?.minInvestmentPerInvestor,
        previousFunding:
          previousFunding || user.profile.startup?.previousFunding,
        team: parsedTeam || user.profile.startup?.team,
        description: description || user.profile.startup?.description,
        pitchDeck: pitchDeckUrl,
        pitchDeckPublicId: pitchDeckPublicId,
        location: parsedLocation || user.profile.startup?.location,
      },
      profilePicture: profilePictureUrl,
      profilePicturePublicId: profilePicturePublicId,
      coverPicture: coverPictureUrl,
      coverPicturePublicId: coverPicturePublicId,
    };

    logger.info("Update data before applying:", updateData);

    await User.updateOne(
      { _id: user._id },
      { $set: updateData },
      { runValidators: true }
    );

    const savedUser = await User.findById(user._id);
    logger.info("User document after update:", {
      _id: savedUser._id,
      profilePicture: savedUser.profilePicture,
      profilePicturePublicId: savedUser.profilePicturePublicId,
      coverPicture: savedUser.coverPicture,
      coverPicturePublicId: savedUser.coverPicturePublicId,
      profile: savedUser.profile,
    });

    const updatedUser = await User.findById(user._id)
      .select("-password")
      .lean();
    sendResponse(res, 200, updatedUser, "Startup details updated successfully");
  } catch (error) {
    logger.error("Edit startup details error:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return sendResponse(res, 400, null, `Validation failed: ${errors}`);
    }
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Register a jobseeker with CV
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with user data and JWT token
 */
const registerWithCV = async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;
    const cvFile = req.file;

    if (!cvFile) {
      return sendResponse(res, 400, null, "CV file is required");
    }

    logger.info("Uploading CV file:", {
      originalname: cvFile.originalname,
      mimetype: cvFile.mimetype,
      size: cvFile.size,
    });

    const cvBuffer = await fs.readFile(cvFile.path);
    const cvOptions = {
      folder: "jobseekers/cvs",
      allowed_formats: ["pdf", "doc", "docx"],
      resource_type: "raw",
    };
    const cvResult = await uploadToCloud(
      cvBuffer,
      cvOptions,
      cvFile.originalname
    );
    await fs.unlink(cvFile.path);

    const userExists = await User.findOne({ email });
    if (userExists) {
      return sendResponse(res, 400, null, "User already exists");
    }

    const userData = {
      email,
      firstName,
      lastName,
      userType: "jobseeker",
      "profile.jobseeker": {
        cv: cvResult.secure_url,
        cvPublicId: cvResult.public_id,
      },
    };

    logger.info("User data before save:", userData);

    const user = new User(userData);
    await user.save();

    await setTokensInCookies(res, user._id, "jobseeker");

    sendResponse(
      res,
      201,
      { user: { id: user._id, email, userType: "jobseeker" } },
      "User registered with CV"
    );
  } catch (error) {
    logger.error("Register with CV error:", {
      message: error.message,
      stack: error.stack,
    });
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return sendResponse(res, 400, null, `Validation failed: ${errors}`);
    }
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Login a user
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with user data and JWT token
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) {
      return sendResponse(res, 401, null, "Invalid credentials");
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendResponse(res, 401, null, "Invalid credentials");
    }

    await setTokensInCookies(res, user._id, user.userType);

    sendResponse(
      res,
      200,
      { user: { id: user._id, email, userType: user.userType } },
      "Login successful"
    );
  } catch (error) {
    logger.error("Login error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

/**
 * Logout a user
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response indicating successful logout
 */
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // Clear authToken and refreshToken cookies
    res.clearCookie("authToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    // If a refresh token exists, remove it from the database
    if (refreshToken) {
      await Token.deleteOne({ token: refreshToken, type: "refresh" });
      logger.info("Refresh token deleted from database:", { refreshToken });
    }

    logger.info("User logged out successfully:", { userId: req.user?.id });

    sendResponse(res, 200, null, "Logged out successfully");
  } catch (error) {
    logger.error("Logout error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Get user type
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with the user's type
 */
const getUserType = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("userType").lean();

    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    logger.info("Retrieved user type:", {
      userId: user._id,
      userType: user.userType,
    });

    sendResponse(
      res,
      200,
      { userId: user._id, userType: user.userType },
      "User type retrieved successfully"
    );
  } catch (error) {
    logger.error("Get user type error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Requests a password reset by sending a 4-digit verification code to the user's email.
 * @async
 * @function requestPasswordReset
 * @param {Object} req - Express request object containing the email.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>} Responds with a message indicating a verification code was sent.
 */
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(
        res,
        200,
        null,
        "If the email exists, a verification code has been sent"
      );
    }

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Delete existing tokens for the user
    await Token.deleteMany({ userId: user._id });

    // Create new token with type "reset"
    await Token.create({
      userId: user._id,
      token: verificationCode,
      type: "reset", // Add the required type field
      expires,
    });

    await sendResetEmail(email, verificationCode);

    sendResponse(
      res,
      200,
      null,
      "If the email exists, a verification code has been sent"
    );
  } catch (error) {
    logger.error("Request password reset error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, "Server error");
  }
};

/**
 * Verifies the provided 4-digit verification code and issues a JWT reset token.
 * @async
 * @function verifyCode
 * @param {Object} req - Express request object containing the email and verification code.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>} Responds with a JWT reset token if the code is valid.
 */
const verifyCode = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return sendResponse(res, 400, null, "Invalid verification code");
    }

    const tokenDoc = await Token.findOne({
      userId: user._id,
      token: verificationCode,
      type: "reset",
    });
    if (!tokenDoc || tokenDoc.expires < new Date()) {
      return sendResponse(
        res,
        400,
        null,
        "Invalid or expired verification code"
      );
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    res.cookie("resetToken", resetToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    await Token.deleteOne({ token: verificationCode });

    sendResponse(
      res,
      200,
      null,
      "Verification successful, use the token to reset your password"
    );
  } catch (error) {
    logger.error("Verify code error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, "Server error");
  }
};

/**
 * Resets the user's password using a valid JWT reset token.
 * @async
 * @function resetPassword
 * @param {Object} req - Express request object containing the reset token and new password.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>} Responds with a success message if the password is reset.
 */
const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const resetToken = req.cookies.resetToken;

    if (!resetToken) {
      return sendResponse(res, 400, null, "Reset token is required");
    }

    let payload;
    try {
      payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      return sendResponse(res, 400, null, "Invalid or expired reset token");
    }

    const user = await User.findById(payload.id).select("+password");
    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    if (!user.password && user.userType === "jobseeker" && user.cv) {
      return sendResponse(
        res,
        400,
        null,
        "This account uses CV-based authentication"
      );
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    res.clearCookie("resetToken", cookieOptions);

    await sendResetEmail(
      user.email,
      "Your password has been successfully reset.",
      false
    );

    sendResponse(res, 200, null, "Password reset successfully");
  } catch (error) {
    logger.error("Reset password error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, "Server error");
  }
};

/**
 * Changes the user's password after verifying the old password.
 * @async
 * @function changePassword
 * @param {Object} req - Express request object containing oldPassword and newPassword.
 * @param {Object} res - Express response object.
 * @returns {Promise<void>} Responds with a success message if the password is changed.
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");
    if (!user || !user.password) {
      return sendResponse(
        res,
        400,
        null,
        "User not found or uses CV-based authentication"
      );
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return sendResponse(res, 401, null, "Invalid old password");
    }

    user.password = newPassword;
    await user.save();

    await sendResetEmail(
      user.email,
      "Your password has been successfully changed.",
      false
    );

    sendResponse(res, 200, null, "Password changed successfully");
  } catch (error) {
    logger.error("Change password error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error);
  }
};

/**
 * Get startup details
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with the startup user's details
 */
const getStartupDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    if (user.userType !== "startup") {
      return sendResponse(res, 403, null, "Access restricted to startups");
    }

    logger.info("Retrieved startup details:", {
      _id: user._id,
      profile: user.profile,
      profilePicture: user.profilePicture,
      coverPicture: user.coverPicture,
    });

    sendResponse(res, 200, user, "Startup details retrieved successfully");
  } catch (error) {
    logger.error("Get startup details error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Validate a JWT token
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with user data if the token is valid
 */
const validateToken = async (req, res) => {
  try {
    // The auth middleware already verifies the token and attaches user info to req.user
    const user = await User.findById(req.user.id).select("-password").lean();

    if (!user) {
      return sendResponse(res, 404, null, "User not found");
    }

    logger.info("Token validated successfully:", {
      userId: user._id,
      userType: user.userType,
      email: user.email,
    });

    sendResponse(
      res,
      200,
      {
        user: {
          id: user._id,
          email: user.email,
          userType: user.userType,
          firstName: user.firstName,
          lastName: user.lastName,
          profile: user.profile,
          profilePicture: user.profilePicture,
          coverPicture: user.coverPicture,
        },
      },
      "Token is valid"
    );
  } catch (error) {
    logger.error("Validate token error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Refresh the authentication token using a valid refresh token
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with the new auth token
 */
const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return sendResponse(res, 401, null, "No refresh token provided");
    }

    const tokenDoc = await Token.findOne({
      token: refreshToken,
      type: "refresh",
    });

    if (!tokenDoc || tokenDoc.expires < new Date()) {
      res.clearCookie("refreshToken", cookieOptions);
      return sendResponse(res, 401, null, "Invalid or expired refresh token");
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) {
      res.clearCookie("refreshToken", cookieOptions);
      return sendResponse(res, 404, null, "User not found");
    }

    const newAuthToken = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("authToken", newAuthToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000,
    });

    sendResponse(
      res,
      200,
      { user: { id: user._id, email: user.email, userType: user.userType } },
      "Token refreshed successfully"
    );
  } catch (error) {
    logger.error("Refresh token error:", {
      message: error.message,
      stack: error.stack,
    });
    res.clearCookie("refreshToken", cookieOptions);
    sendResponse(res, 500, null, "Server error");
  }
};

module.exports = {
  register,
  registerJobseekerDetails,
  registerInvestorDetails,
  editStartupDetails,
  registerWithCV,
  login,
  logout,
  getUserType,
  requestPasswordReset,
  verifyCode,
  resetPassword,
  changePassword,
  getStartupDetails,
  validateToken,
  refreshToken,
};
