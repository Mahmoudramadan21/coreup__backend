const fs = require("fs").promises;
const mongoose = require("mongoose");
const { User, Investor, Startup } = require("../models/User");
const { sendResponse } = require("../utils/response");
const { uploadToCloud } = require("../services/cloudService");
const logger = require("../utils/logger");

const countryFlagMap = {
  EGYPT: "🇪🇬",
  USA: "🇺🇸",
  UK: "🇬🇧",
};

/**
 * Update investor contact information with additional validation
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with updated user data
 */
const updateInvestorContactInfo = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, country, city } = req.body;

    logger.debug("Update contact info request body:", req.body);
    logger.debug("req.user:", req.user);
    logger.debug("req.files:", req.files); // Log files to debug

    // Validate req.user.id
    if (!req.user?.id || !mongoose.isValidObjectId(req.user.id)) {
      logger.error("Invalid req.user.id:", req.user);
      return sendResponse(res, 401, null, "Invalid user ID");
    }

    // Validate user existence
    const investor = await Investor.findById(req.user.id).lean();
    if (!investor) {
      logger.error("Investor not found for ID:", req.user.id);
      return sendResponse(res, 404, null, "User not found");
    }
    logger.debug("Investor before update:", investor);

    // Check email uniqueness
    if (email && email !== investor.email) {
      const emailExists = await User.findOne({
        email,
        _id: { $ne: req.user.id },
      });
      if (emailExists) {
        logger.warn("Email already in use:", email);
        return sendResponse(res, 400, null, "Email already in use");
      }
    }

    // Prepare update object
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (phone) updateData.phone = phone;
    if (country || city) {
      updateData.location = {
        country: country || investor.location?.country,
        city: city || investor.location?.city,
        area: investor.location?.area || null,
      };
    }
    updateData.updatedAt = new Date(); // Explicitly update timestamp

    // Handle profile picture upload
    if (req.files && req.files.profilePicture && req.files.profilePicture[0]) {
      const profilePicture = req.files.profilePicture[0];
      if (!profilePicture.buffer) {
        logger.error("Profile picture buffer is undefined:", profilePicture);
        return sendResponse(res, 400, null, "Invalid profile picture file");
      }
      const profileOptions = {
        folder: "investors/profiles",
        allowed_formats: ["jpg", "jpeg", "png"],
        resource_type: "image",
      };
      const profileResult = await uploadToCloud(
        profilePicture.buffer,
        profileOptions,
        profilePicture.originalname
      );
      updateData.profilePicture = profileResult.secure_url;
      logger.debug("Profile picture uploaded:", profileResult.secure_url);
    }

    // Handle cover picture upload
    if (req.files && req.files.coverPicture && req.files.coverPicture[0]) {
      const coverPicture = req.files.coverPicture[0];
      if (!coverPicture.buffer) {
        logger.error("Cover picture buffer is undefined:", coverPicture);
        return sendResponse(res, 400, null, "Invalid cover picture file");
      }
      const coverOptions = {
        folder: "investors/covers",
        allowed_formats: ["jpg", "jpeg", "png"],
        resource_type: "image",
      };
      const coverResult = await uploadToCloud(
        coverPicture.buffer,
        coverOptions,
        coverPicture.originalname
      );
      updateData.coverPicture = coverResult.secure_url;
      logger.debug("Cover picture uploaded:", coverResult.secure_url);
    }

    logger.debug("Update data to apply:", updateData);

    // Perform update using MongoDB driver directly
    const result = await mongoose.connection.db.collection("users").updateOne(
      { _id: new mongoose.Types.ObjectId(req.user.id), userType: "investor" },
      { $set: updateData },
      { w: "majority" } // Ensure write concern
    );

    if (result.matchedCount === 0) {
      logger.error("No document matched for ID:", req.user.id);
      return sendResponse(res, 404, null, "User not found");
    }
    if (result.modifiedCount === 0) {
      logger.warn("No document modified for ID:", req.user.id);
    }

    // Fetch the updated document
    const updatedInvestor = await Investor.findById(req.user.id)
      .select("-password")
      .lean();

    if (!updatedInvestor) {
      logger.error("Failed to fetch updated investor for ID:", req.user.id);
      return sendResponse(res, 404, null, "Failed to retrieve updated user");
    }

    logger.debug("Updated investor:", updatedInvestor);

    // Verify update in database
    const dbCheck = await mongoose.connection.db
      .collection("users")
      .findOne(
        { _id: new mongoose.Types.ObjectId(req.user.id) },
        { projection: { password: 0 } }
      );
    logger.debug("Database check after update:", dbCheck);

    sendResponse(
      res,
      200,
      updatedInvestor,
      "Contact information updated successfully"
    );
  } catch (error) {
    logger.error("Update investor contact info error:", {
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
 * Update investor investment criteria
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with updated user data
 */
const updateInvestmentCriteria = async (req, res) => {
  try {
    const { industries, locations, investmentRange, stage } = req.body;

    const investor = await Investor.findById(req.user.id);
    if (!investor) {
      return sendResponse(res, 404, null, "User not found");
    }

    // Initialize or update investmentCriteria object
    investor.profile.investor.investmentCriteria = investor.profile.investor
      .investmentCriteria || {
      industries: [],
      locations: [],
      investmentRange: { min: 0, max: 0 },
      stage: [],
    };

    // Update fields with any length of arrays or single values
    if (industries !== undefined) {
      investor.profile.investor.investmentCriteria.industries = Array.isArray(
        industries
      )
        ? industries
        : [industries];
    }
    if (locations !== undefined) {
      investor.profile.investor.investmentCriteria.locations = Array.isArray(
        locations
      )
        ? locations
        : [locations];
    }
    if (investmentRange !== undefined) {
      investor.profile.investor.investmentCriteria.investmentRange = {
        min: Number(investmentRange.min) || 0,
        max: Number(investmentRange.max) || 0,
      };
    }
    if (stage !== undefined) {
      investor.profile.investor.investmentCriteria.stage = Array.isArray(stage)
        ? stage
        : [stage];
    }

    investor.markModified("profile.investor.investmentCriteria");
    await investor.save();

    const updatedUser = await Investor.findById(investor._id)
      .select("-password")
      .lean();
    sendResponse(
      res,
      200,
      updatedUser,
      "Investment criteria updated successfully"
    );
  } catch (error) {
    logger.error("Update investment criteria error:", {
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
 * Update investor profile
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with updated user data
 */
const updateInvestorProfile = async (req, res) => {
  try {
    const {
      investorType,
      linkedIn,
      twitter,
      facebook,
      website,
      bio,
      areasOfExpertise,
      numberOfPreviousInvestments,
      companies,
      investmentCriteria,
    } = req.body;

    logger.debug("req.user in updateInvestorProfile:", req.user);

    const investor = await Investor.findById(req.user.id);
    if (!investor) {
      logger.error("Investor not found for ID:", req.user.id);
      return sendResponse(res, 404, null, "User not found");
    }

    logger.debug("Investor before update:", investor.toObject());

    // Initialize profile.investor if undefined
    if (!investor.profile) investor.profile = {};
    if (!investor.profile.investor) investor.profile.investor = {};

    // Initialize investmentCriteria if undefined
    if (!investor.profile.investor.investmentCriteria) {
      investor.profile.investor.investmentCriteria = {
        industries: ["Technology", "Software", "Finance"],
        locations: [],
        investmentRange: { min: 0, max: 0 },
        stage: ["seed"],
      };
    }

    // Update fields
    investor.profile.investor.investorType = investorType;

    investor.profile.investor.linkedIn =
      linkedIn || investor.profile.investor.linkedIn;

    investor.profile.investor.twitter =
      twitter || investor.profile.investor.twitter;

    investor.profile.investor.facebook =
      facebook || investor.profile.investor.facebook;

    investor.profile.investor.website =
      website || investor.profile.investor.website;

    // Update bio without validation
    investor.profile.investor.bio = bio || investor.profile.investor.bio;

    // Update areasOfExpertise without validation
    investor.profile.investor.areasOfExpertise = areasOfExpertise;

    // Update numberOfPreviousInvestments without validation
    if (numberOfPreviousInvestments !== undefined) {
      investor.profile.investor.numberOfPreviousInvestments =
        numberOfPreviousInvestments;
    }

    // Update companies with optional date
    if (companies !== undefined) {
      investor.profile.investor.companies = companies.map((company) => ({
        name: company.name || "",
        amount: company.amount || 0,
        date: company.date ? new Date(company.date) : null, // Allow null if date is missing
      }));
    }

    // Update investmentCriteria if provided
    if (investmentCriteria && investmentCriteria.stage) {
      investor.profile.investor.investmentCriteria.stage =
        investmentCriteria.stage;
    }

    // Ensure portfolio is initialized
    investor.profile.investor.portfolio =
      investor.profile.investor.portfolio || [];
    investor.markModified("profile.investor");
    await investor.save();

    // Fetch and verify updated document
    const updatedInvestor = await Investor.findById(investor._id)
      .select("-password")
      .lean();
    if (!updatedInvestor) {
      logger.error("Failed to fetch updated investor for ID:", req.user.id);
      return sendResponse(res, 500, null, "Failed to retrieve updated user");
    }

    logger.debug("Updated investor:", updatedInvestor);
    sendResponse(
      res,
      200,
      updatedInvestor,
      "Investor profile updated successfully"
    );
  } catch (error) {
    logger.error("Update investor profile error:", {
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
 * Get startups matching investor's investment criteria with relaxed matching
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with matching startups formatted for UI cards
 */
const getMatchingStartups = async (req, res) => {
  try {
    const investor = await Investor.findById(req.user.id).lean();
    if (!investor) {
      logger.error("Investor not found for ID:", req.user.id);
      return sendResponse(res, 404, null, "Investor not found");
    }

    const { investmentCriteria } = investor.profile?.investor || {};
    logger.debug("Investment criteria for matching:", {
      investorId: req.user.id,
      investmentCriteria,
    });

    // Initialize default criteria if none exist
    const { min = 0, max = Number.MAX_SAFE_INTEGER } =
      investmentCriteria?.investmentRange || {};
    const industries = investmentCriteria?.industries || [];
    const stages = investmentCriteria?.stage || [];
    const locations = investmentCriteria?.locations || [];

    // Calculate tolerance for investment range (±10%)
    const minWithTolerance = min * 0.9;
    const maxWithTolerance = max === Number.MAX_SAFE_INTEGER ? max : max * 1.1;

    // Build match conditions for relaxed filtering
    const matchConditions = [
      { userType: "startup" },
      { "profile.startup": { $exists: true } },
    ];

    // Add funding range filter with tolerance
    if (min || max !== Number.MAX_SAFE_INTEGER) {
      matchConditions.push({
        "profile.startup.fundingGoal.amount": {
          $gte: Number(minWithTolerance),
          $lte: Number(maxWithTolerance),
        },
      });
    }

    // Add industry, stage, and location filters as optional ($or)
    const optionalFilters = [];

    if (industries.length > 0) {
      optionalFilters.push({
        $or: [
          { "profile.startup.industry1": { $in: industries } },
          { "profile.startup.industry2": { $in: industries } },
        ],
      });
    }

    if (stages.length > 0) {
      optionalFilters.push({
        "profile.startup.stage": { $in: stages },
      });
    }

    if (locations.length > 0) {
      const locationConditions = locations.map((loc) => ({
        $or: [
          loc.country
            ? { "profile.startup.location.country": loc.country }
            : {},
          loc.city ? { "profile.startup.location.city": loc.city } : {},
        ],
      }));
      optionalFilters.push({ $or: locationConditions });
    }

    // Build aggregation pipeline
    const pipeline = [];

    // If no criteria or optional filters exist, use minimal matching
    if (!investmentCriteria || optionalFilters.length === 0) {
      pipeline.push({
        $match: {
          $and: matchConditions,
        },
      });
    } else {
      // Combine all filters with $or for relaxed matching
      pipeline.push({
        $match: {
          $and: matchConditions,
          $or: optionalFilters,
        },
      });
    }

    // Project fields for UI cards
    pipeline.push({
      $project: {
        cardData: {
          id: "$_id",
          profilePic: { $ifNull: ["$profilePicture", null] },
          coverPic: { $ifNull: ["$coverPicture", null] },
          executive: {
            $ifNull: [
              { $arrayElemAt: ["$profile.startup.team.name", 0] },
              "Unknown",
            ],
          },
          title: { $ifNull: ["$profile.startup.pitchTitle", "Untitled"] },
          location: {
            country: {
              $ifNull: ["$profile.startup.location.country", "Unknown"],
            },
            city: { $ifNull: ["$profile.startup.location.city", "Unknown"] },
          },
          description: {
            $ifNull: ["$profile.startup.description", "No description"],
          },
          keyPoints: [
            {
              label: "Stage",
              value: { $ifNull: ["$profile.startup.stage", "Unknown"] },
            },
            {
              label: "Amount Raised",
              value: { $ifNull: ["$profile.startup.amountRaised", 0] },
            },
            {
              label: "Previous Funding",
              value: { $ifNull: ["$profile.startup.previousFunding", 0] },
            },
          ],
          totalRequired: {
            $ifNull: ["$profile.startup.fundingGoal.amount", 0],
          },
          minPerInvestor: {
            $ifNull: ["$profile.startup.minInvestmentPerInvestor", 0],
          },
          industries: [
            "$profile.startup.industry1",
            "$profile.startup.industry2",
          ],
          successPrediction: {
            $ifNull: [
              "$profile.startup.successPrediction",
              { score: null, details: null },
            ],
          },
        },
      },
    });

    // Execute aggregation
    const matchingStartups = await User.aggregate(pipeline);

    // Format the response to extract cardData
    const formattedResponse = matchingStartups
      .filter((startup) => startup.cardData) // Ensure cardData exists
      .map((startup) => ({
        ...startup.cardData,
        industries: startup.cardData.industries.filter(Boolean), // Remove null/undefined industries
      }));

    // Log the results for debugging
    logger.debug("Matching startups found:", {
      investorId: req.user.id,
      count: formattedResponse.length,
      startups: formattedResponse.map((s) => ({
        id: s.id,
        title: s.title,
        industries: s.industries,
        stage: s.keyPoints.find((kp) => kp.label === "Stage")?.value,
        location: s.location,
      })),
    });

    sendResponse(
      res,
      200,
      formattedResponse,
      formattedResponse.length > 0
        ? "Matching startups retrieved successfully"
        : "No matching startups found"
    );
  } catch (error) {
    logger.error("Get matching startups error:", {
      message: error.message,
      stack: error.stack,
      investorId: req.user.id,
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
 * Search for startups based on specified criteria
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with matching startups
 */
const searchStartups = async (req, res) => {
  try {
    const {
      industry,
      stage,
      country,
      city,
      minFunding,
      maxFunding,
      minSuccessScore,
    } = req.query;

    // Validate query parameters
    if (minFunding && isNaN(minFunding)) {
      return sendResponse(res, 400, null, "Invalid minFunding value");
    }
    if (maxFunding && isNaN(maxFunding)) {
      return sendResponse(res, 400, null, "Invalid maxFunding value");
    }
    if (
      minSuccessScore &&
      (isNaN(minSuccessScore) || minSuccessScore < 0 || minSuccessScore > 100)
    ) {
      return sendResponse(res, 400, null, "Invalid minSuccessScore value");
    }
    if (stage && !["idea", "prototype", "mvp", "scaling"].includes(stage)) {
      return sendResponse(res, 400, null, "Invalid stage value");
    }

    // Build query object
    const query = { userType: "startup" };

    if (industry) {
      query.$or = [
        { "profile.startup.industry1": industry },
        { "profile.startup.industry2": industry },
      ];
    }
    if (stage) {
      query["profile.startup.stage"] = stage;
    }
    if (country) {
      query["profile.startup.location.country"] = country;
    }
    if (city) {
      query["profile.startup.location.city"] = city;
    }
    if (minFunding || maxFunding) {
      query["profile.startup.fundingGoal.amount"] = {};
      if (minFunding) {
        query["profile.startup.fundingGoal.amount"].$gte = Number(minFunding);
      }
      if (maxFunding) {
        query["profile.startup.fundingGoal.amount"].$lte = Number(maxFunding);
      }
    }
    if (minSuccessScore) {
      query["profile.startup.successPrediction.score"] = {
        $gte: Number(minSuccessScore),
      };
    }

    logger.debug("Search startups query:", query);

    // Execute query with lean for performance
    const startups = await Startup.find(query)
      .select(
        "firstName lastName profilePicture coverPicture profile.startup.industry1 profile.startup.industry2 " +
          "profile.startup.stage profile.startup.location profile.startup.fundingGoal " +
          "profile.startup.successPrediction profile.startup.description profile.startup.pitchTitle " +
          "profile.startup.amountRaised profile.startup.previousFunding profile.startup.minInvestmentPerInvestor " +
          "profile.startup.team"
      )
      .lean();

    // Filter out invalid startups and format response
    const formattedStartups = startups
      .filter((startup) => {
        const isValid = startup.profile && startup.profile.startup;
        if (!isValid) {
          logger.warn("Invalid startup document found:", {
            id: startup._id,
            profile: startup.profile,
          });
        }
        return isValid;
      })
      .map((startup) => ({
        id: startup._id,
        profilePic: startup.profilePicture || null,
        coverPic: startup.coverPicture || null,
        executive:
          startup.profile.startup.team &&
          startup.profile.startup.team.length > 0
            ? startup.profile.startup.team[0].name
            : "Unknown",
        title: startup.profile.startup.pitchTitle || "Untitled",
        location: startup.profile.startup.location || {
          country: "unknown",
          city: "unknown",
        },
        description: startup.profile.startup.description || "No description",
        keyPoints: [
          {
            label: "Stage",
            value: startup.profile.startup.stage || "unknown",
          },
          {
            label: "Amount Raised",
            value: startup.profile.startup.amountRaised || 0,
          },
          {
            label: "Previous Funding",
            value: startup.profile.startup.previousFunding || 0,
          },
        ],
        totalRequired: startup.profile.startup.fundingGoal
          ? startup.profile.startup.fundingGoal.amount
          : 0,
        minPerInvestor: startup.profile.startup.minInvestmentPerInvestor || 0,
        industries: [
          startup.profile.startup.industry1,
          startup.profile.startup.industry2,
        ].filter(Boolean),
        successPrediction: startup.profile.startup.successPrediction || {
          score: null,
          details: null,
        },
      }));

    logger.debug("Found startups:", formattedStartups);

    sendResponse(
      res,
      200,
      formattedStartups,
      startups.length > 0
        ? "Startups retrieved successfully"
        : "No startups found matching the criteria"
    );
  } catch (error) {
    logger.error("Search startups error:", {
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
 * Get detailed information about a specific startup
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with startup details
 */
const getStartupDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, null, "Invalid startup ID");
    }

    // Query the startup
    const startup = await User.findOne({ _id: id, userType: "startup" })
      .select(
        "firstName lastName profilePicture coverPicture profile.startup.pitchTitle " +
          "profile.startup.website profile.startup.mobileNumber profile.startup.industry1 " +
          "profile.startup.industry2 profile.startup.location profile.startup.description " +
          "profile.startup.fundingGoal profile.startup.amountRaised profile.startup.minInvestmentPerInvestor " +
          "profile.startup.stage profile.startup.idealInvestorRole profile.startup.previousFunding " +
          "profile.startup.team profile.startup.pitchDeck profile.startup.successPrediction"
      )
      .lean();

    // Check if startup exists
    if (!startup || !startup.profile || !startup.profile.startup) {
      return sendResponse(res, 404, null, "Startup not found");
    }

    // Format the response
    const formattedStartup = {
      id: startup._id,
      profilePic: startup.profilePicture || null,
      coverPic: startup.coverPicture || null,
      executive:
        startup.profile.startup.team && startup.profile.startup.team.length > 0
          ? startup.profile.startup.team[0].name
          : "Unknown",
      title: startup.profile.startup.pitchTitle || "Untitled",
      location: startup.profile.startup.location || {
        country: "unknown",
        city: "unknown",
      },
      description: startup.profile.startup.description || "No description",
      keyPoints: [
        { label: "Stage", value: startup.profile.startup.stage || "unknown" },
        {
          label: "Amount Raised",
          value: startup.profile.startup.amountRaised || 0,
        },
        {
          label: "Previous Funding",
          value: startup.profile.startup.previousFunding || 0,
        },
      ],
      totalRequired: startup.profile.startup.fundingGoal
        ? startup.profile.startup.fundingGoal.amount
        : 0,
      minPerInvestor: startup.profile.startup.minInvestmentPerInvestor || 0,
      industries: [
        startup.profile.startup.industry1,
        startup.profile.startup.industry2,
      ].filter(Boolean),
      successPrediction: startup.profile.startup.successPrediction || {
        score: null,
        details: null,
      },
      website: startup.profile.startup.website || null,
      mobileNumber: startup.profile.startup.mobileNumber || null,
      team: startup.profile.startup.team || [],
      pitchDeck: startup.profile.startup.pitchDeck || null,
    };

    logger.debug("Startup details retrieved:", formattedStartup);

    sendResponse(
      res,
      200,
      formattedStartup,
      "Startup details retrieved successfully"
    );
  } catch (error) {
    logger.error("Get startup details error:", {
      message: error.message,
      stack: error.stack,
    });
    sendResponse(res, 500, null, error.message || "Server error");
  }
};

/**
 * Get investors matching startup's profile with relaxed matching
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with matching investors formatted for UI cards
 */
const getMatchingInvestors = async (req, res) => {
  try {
    // Fetch the startup's profile
    const startup = await Startup.findById(req.user.id).lean();
    if (!startup) {
      logger.error("Startup not found for ID:", req.user.id);
      return sendResponse(res, 404, null, "Startup not found");
    }

    const startupProfile = startup.profile?.startup;
    if (!startupProfile) {
      logger.warn("Startup profile not set for ID:", req.user.id);
      return sendResponse(res, 400, null, "Startup profile not set");
    }

    // Extract startup criteria
    const industries = [
      startupProfile.industry1,
      startupProfile.industry2,
    ].filter(Boolean);
    const stage = startupProfile.stage;
    const location = startupProfile.location || {};
    const fundingGoal = startupProfile.fundingGoal?.amount || 0;

    logger.debug("Startup criteria for matching:", {
      startupId: req.user.id,
      industries,
      stage,
      location,
      fundingGoal,
    });

    // Build match conditions for relaxed filtering
    const matchConditions = [
      { userType: "investor" },
      { "profile.investor": { $exists: true } },
    ];

    // Add optional filters for investors
    const optionalFilters = [];

    if (industries.length > 0) {
      optionalFilters.push({
        "profile.investor.investmentCriteria.industries": { $in: industries },
      });
    }

    if (stage) {
      optionalFilters.push({
        "profile.investor.investmentCriteria.stage": { $in: [stage] },
      });
    }

    if (location.country || location.city) {
      const locationConditions = [];
      if (location.country) {
        locationConditions.push({
          "profile.investor.investmentCriteria.locations.country":
            location.country,
        });
      }
      if (location.city) {
        locationConditions.push({
          "profile.investor.investmentCriteria.locations.city": location.city,
        });
      }
      if (locationConditions.length > 0) {
        optionalFilters.push({ $or: locationConditions });
      }
    }

    if (fundingGoal > 0) {
      const fundingGoalWithTolerance = {
        $gte: Number(fundingGoal * 0.9),
        $lte: Number(fundingGoal * 1.1),
      };
      optionalFilters.push({
        $or: [
          {
            "profile.investor.investmentCriteria.investmentRange.min": {
              $lte: fundingGoalWithTolerance.$lte,
            },
          },
          {
            "profile.investor.investmentCriteria.investmentRange.max": {
              $gte: fundingGoalWithTolerance.$gte,
            },
          },
          {
            "profile.investor.investmentCriteria.investmentRange": {
              $exists: false,
            },
          },
        ],
      });
    }

    // Build aggregation pipeline
    const pipeline = [];

    // If no optional filters, use minimal matching
    if (optionalFilters.length === 0) {
      pipeline.push({
        $match: {
          $and: matchConditions,
        },
      });
    } else {
      // Combine all filters with $or for relaxed matching
      pipeline.push({
        $match: {
          $and: matchConditions,
          $or: optionalFilters,
        },
      });
    }

    // Project fields for UI cards
    pipeline.push({
      $project: {
        cardData: {
          id: "$_id",
          profilePic: { $ifNull: ["$profilePicture", null] },
          coverPic: { $ifNull: ["$coverPicture", null] },
          name: { $concat: ["$firstName", " ", "$lastName"] },
          bio: { $ifNull: ["$profile.investor.bio", "No bio available"] },
          investorType: {
            $ifNull: ["$profile.investor.investorType", "Unknown"],
          },
          location: {
            country: { $ifNull: ["$location.country", "Unknown"] },
            city: { $ifNull: ["$location.city", "Unknown"] },
          },
          keyPoints: [
            {
              label: "Investor Type",
              value: { $ifNull: ["$profile.investor.investorType", "Unknown"] },
            },
            {
              label: "Previous Investments",
              value: {
                $ifNull: ["$profile.investor.numberOfPreviousInvestments", 0],
              },
            },
          ],
          investmentCriteria: {
            industries: {
              $ifNull: ["$profile.investor.investmentCriteria.industries", []],
            },
            locations: {
              $ifNull: ["$profile.investor.investmentCriteria.locations", []],
            },
            investmentRange: {
              $ifNull: [
                "$profile.investor.investmentCriteria.investmentRange",
                { min: 0, max: 0 },
              ],
            },
            stage: {
              $ifNull: ["$profile.investor.investmentCriteria.stage", []],
            },
          },
        },
      },
    });

    // Execute aggregation
    const matchingInvestors = await User.aggregate(pipeline);

    // Format the response to extract cardData
    const formattedResponse = matchingInvestors
      .filter((investor) => investor.cardData)
      .map((investor) => ({
        ...investor.cardData,
        investmentCriteria: {
          ...investor.cardData.investmentCriteria,
          industries:
            investor.cardData.investmentCriteria.industries.filter(Boolean),
        },
      }));

    // Log the results for debugging
    logger.debug("Matching investors found:", {
      startupId: req.user.id,
      count: formattedResponse.length,
      investors: formattedResponse.map((i) => ({
        id: i.id,
        name: i.name,
        investorType: i.investorType,
        industries: i.investmentCriteria.industries,
        stage: i.investmentCriteria.stage,
        location: i.location,
      })),
    });

    sendResponse(
      res,
      200,
      formattedResponse,
      formattedResponse.length > 0
        ? "Matching investors retrieved successfully"
        : "No matching investors found"
    );
  } catch (error) {
    logger.error("Get matching investors error:", {
      message: error.message,
      stack: error.stack,
      startupId: req.user.id,
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

module.exports = {
  updateInvestorContactInfo,
  updateInvestmentCriteria,
  updateInvestorProfile,
  getMatchingStartups,
  searchStartups,
  getStartupDetails,
  getMatchingInvestors,
};
