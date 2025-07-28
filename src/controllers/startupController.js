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

/**
 * Search for investors based on specified criteria
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with matching investors formatted for UI cards
 */
const searchInvestors = async (req, res) => {
  try {
    // Validate user authentication and role
    const startup = await Startup.findById(req.user.id).lean();
    if (!startup) {
      logger.error("Startup not found for ID:", req.user.id);
      return sendResponse(res, 404, null, "Startup not found");
    }

    // Extract query parameters
    const {
      industry,
      investorType,
      country,
      city,
      minInvestment,
      maxInvestment,
      stage,
    } = req.query;

    // Validate query parameters
    if (minInvestment && isNaN(minInvestment)) {
      return sendResponse(res, 400, null, "Invalid minInvestment value");
    }
    if (maxInvestment && isNaN(maxInvestment)) {
      return sendResponse(res, 400, null, "Invalid maxInvestment value");
    }
    if (
      investorType &&
      !["angel", "vc", "privateEquity"].includes(investorType)
    ) {
      return sendResponse(res, 400, null, "Invalid investorType value");
    }
    if (
      stage &&
      !["seed", "early-stage", "growth", "late-stage"].includes(stage)
    ) {
      return sendResponse(res, 400, null, "Invalid stage value");
    }

    // Build query object
    const query = {
      userType: "investor",
      "profile.investor": { $exists: true },
    };

    if (industry) {
      query["profile.investor.investmentCriteria.industries"] = industry;
    }
    if (investorType) {
      query["profile.investor.investorType"] = investorType;
    }
    if (country) {
      query["profile.investor.investmentCriteria.locations.country"] = country;
    }
    if (city) {
      query["profile.investor.investmentCriteria.locations.city"] = city;
    }
    if (minInvestment || maxInvestment) {
      query["profile.investor.investmentCriteria.investmentRange"] = {};
      if (minInvestment) {
        query["profile.investor.investmentCriteria.investmentRange"].min = {
          $gte: Number(minInvestment),
        };
      }
      if (maxInvestment) {
        query["profile.investor.investmentCriteria.investmentRange"].max = {
          $lte: Number(maxInvestment),
        };
      }
    }
    if (stage) {
      query["profile.investor.investmentCriteria.stage"] = stage;
    }

    logger.debug("Search investors query:", { startupId: req.user.id, query });

    // Execute query with lean for performance
    const investors = await Investor.find(query)
      .select(
        "firstName lastName profilePicture coverPicture profile.investor.investorType " +
          "profile.investor.bio profile.investor.investmentCriteria profile.investor.numberOfPreviousInvestments " +
          "location"
      )
      .lean();

    // Filter out invalid investors and format response
    const formattedInvestors = investors
      .filter((investor) => investor.profile && investor.profile.investor)
      .map((investor) => ({
        id: investor._id,
        profilePic: investor.profilePicture || null,
        coverPic: investor.coverPicture || null,
        name: `${investor.firstName} ${investor.lastName}`,
        bio: investor.profile.investor.bio || "No bio available",
        investorType: investor.profile.investor.investorType || "Unknown",
        location: investor.location || { country: "Unknown", city: "Unknown" },
        keyPoints: [
          {
            label: "Investor Type",
            value: investor.profile.investor.investorType || "Unknown",
          },
          {
            label: "Previous Investments",
            value: investor.profile.investor.numberOfPreviousInvestments || 0,
          },
        ],
        investmentCriteria: {
          industries:
            investor.profile.investor.investmentCriteria?.industries?.filter(
              Boolean
            ) || [],
          locations:
            investor.profile.investor.investmentCriteria?.locations || [],
          investmentRange: investor.profile.investor.investmentCriteria
            ?.investmentRange || { min: 0, max: 0 },
          stage: investor.profile.investor.investmentCriteria?.stage || [],
        },
      }));

    logger.debug("Found investors:", {
      startupId: req.user.id,
      count: formattedInvestors.length,
      investors: formattedInvestors.map((i) => ({
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
      formattedInvestors,
      formattedInvestors.length > 0
        ? "Investors retrieved successfully"
        : "No investors found matching the criteria"
    );
  } catch (error) {
    logger.error("Search investors error:", {
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
  getMatchingInvestors,
  searchInvestors,
};
