const mongoose = require("mongoose");
const { User, Investor, Startup } = require("../models/User");
const Interaction = require("../models/Interaction");
const { sendResponse } = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Send a new interaction (connection/nudge)
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with the created interaction
 */
async function sendInteraction(req, res) {
  try {
    const { id: receiverId } = req.params;
    const senderId = req.user.id;
    const { amount = 0, message = null } = req.body;

    // Validate ObjectId
    if (!mongoose.isValidObjectId(receiverId)) {
      throw new Error("Invalid receiver ID");
    }

    const sender = await User.findById(senderId).select("+userType");
    if (!sender) throw new Error("Sender not found");

    const receiver = await User.findById(receiverId).select("+userType");
    if (!receiver) throw new Error("Receiver not found");

    logger.debug("Sender and receiver details", {
      sender: { id: senderId, userType: sender.userType },
      receiver: { id: receiverId, userType: receiver.userType },
    });

    if (sender.userType === "investor" && receiver.userType !== "startup") {
      throw new Error("Receiver must be a startup for connection request");
    }
    if (sender.userType === "startup" && receiver.userType !== "investor") {
      throw new Error("Receiver must be an investor for nudge request");
    }

    const existingInteraction = await Interaction.findOne({
      sender: senderId,
      receiver: receiverId,
      status: { $in: ["pending", "accepted"] },
    });
    if (existingInteraction) {
      throw new Error(`Interaction already ${existingInteraction.status}`);
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const interaction = new Interaction({
      sender: senderId,
      receiver: receiverId,
      amount: sender.userType === "startup" ? amount : 0,
      currency: sender.userType === "startup" ? "VCR" : "USD",
      message,
      expiresAt,
    });
    await interaction.save();

    logger.info("Interaction sent", {
      senderId,
      receiverId,
      status: interaction.status,
      interactionId: interaction._id,
      expiresAt: interaction.expiresAt,
    });
    sendResponse(res, 201, interaction, "Interaction sent successfully");
  } catch (error) {
    logger.error("Send interaction error", {
      message: error.message,
      stack: error.stack,
      senderId: req.user.id,
      receiverId: req.params.id,
    });
    sendResponse(res, 400, null, error.message);
  }
}

/**
 * Update interaction status
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with the updated interaction
 */
async function updateInteraction(req, res) {
  try {
    const { id: interactionId } = req.params;
    const { status } = req.body;
    const receiverId = req.user.id;

    if (!mongoose.isValidObjectId(interactionId)) {
      throw new Error("Invalid interaction ID");
    }

    if (!["accepted", "rejected", "expired"].includes(status)) {
      throw new Error("Invalid status value");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const interaction = await Interaction.findOne({
        _id: interactionId,
        receiver: receiverId,
      }).session(session);
      if (!interaction) {
        throw new Error("Interaction not found or unauthorized");
      }

      logger.debug("Interaction found for update", {
        interactionId,
        receiverId,
        currentStatus: interaction.status,
      });

      if (interaction.status !== "pending") {
        throw new Error(
          `Interaction already processed (status: ${interaction.status})`
        );
      }

      interaction.status = status;
      await interaction.save({ session });

      await session.commitTransaction();
      logger.info("Interaction updated", { interactionId, status });
      sendResponse(res, 200, interaction, "Interaction updated successfully");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error("Update interaction error", {
      message: error.message,
      stack: error.stack,
      interactionId: req.params.id,
      receiverId: req.user.id,
    });
    sendResponse(res, 400, null, error.message);
  }
}

/**
 * Get user's accepted interactions
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with accepted interactions
 */
async function getInteractions(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("+userType");
    if (!user) throw new Error("User not found");

    // Update expired interactions
    await Interaction.updateMany(
      {
        expiresAt: { $lte: new Date() },
        status: "pending",
      },
      { $set: { status: "expired" } }
    );

    if (!["investor", "startup"].includes(user.userType)) {
      throw new Error("Only investors and startups can view interactions");
    }

    // Pipeline to fetch accepted interactions where user is either sender or receiver
    const pipeline = [
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { receiver: new mongoose.Types.ObjectId(userId) },
          ],
          status: "accepted",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "sender",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $unwind: {
          path: "$sender",
          preserveNullAndEmptyArrays: true, // Handle missing sender
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "receiver",
          foreignField: "_id",
          as: "receiver",
        },
      },
      {
        $unwind: {
          path: "$receiver",
          preserveNullAndEmptyArrays: true, // Handle missing receiver
        },
      },
      {
        $match: {
          $or: [
            { "sender.userType": { $in: ["investor", "startup"] } },
            { "receiver.userType": { $in: ["investor", "startup"] } },
          ],
        },
      },
      {
        $project: {
          cardData: {
            $cond: {
              if: { $eq: ["$sender._id", new mongoose.Types.ObjectId(userId)] },
              then: {
                // User is the sender, show receiver's data (startup for investor, investor for startup)
                id: { $ifNull: ["$receiver._id", null] },
                profilePic: { $ifNull: ["$receiver.profilePicture", null] },
                coverPic: { $ifNull: ["$receiver.coverPicture", null] },
                title: {
                  $cond: {
                    if: { $eq: ["$receiver.userType", "investor"] },
                    then: {
                      $concat: [
                        { $ifNull: ["$receiver.firstName", ""] },
                        " ",
                        { $ifNull: ["$receiver.lastName", ""] },
                      ],
                    },
                    else: {
                      $ifNull: [
                        "$receiver.profile.startup.pitchTitle",
                        "Untitled",
                      ],
                    },
                  },
                },
                executive: {
                  $cond: {
                    if: { $eq: ["$receiver.userType", "startup"] },
                    then: {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            "$receiver.profile.startup.team.name",
                            0,
                          ],
                        },
                        "Unknown",
                      ],
                    },
                    else: null,
                  },
                },
                location: {
                  country: {
                    $ifNull: [
                      {
                        $ifNull: [
                          "$receiver.profile.startup.location.country",
                          "$receiver.location.country",
                        ],
                      },
                      "Unknown",
                    ],
                  },
                  city: {
                    $ifNull: [
                      {
                        $ifNull: [
                          "$receiver.profile.startup.location.city",
                          "$receiver.location.city",
                        ],
                      },
                      "Unknown",
                    ],
                  },
                },
                description: {
                  $ifNull: [
                    {
                      $ifNull: [
                        "$receiver.profile.startup.description",
                        "$receiver.profile.investor.bio",
                      ],
                    },
                    "No description",
                  ],
                },
                keyPoints: [
                  {
                    label: {
                      $cond: {
                        if: { $eq: ["$receiver.userType", "investor"] },
                        then: "Investor Type",
                        else: "Stage",
                      },
                    },
                    value: {
                      $cond: {
                        if: { $eq: ["$receiver.userType", "investor"] },
                        then: {
                          $ifNull: [
                            "$receiver.profile.investor.investorType",
                            "Unknown",
                          ],
                        },
                        else: {
                          $ifNull: [
                            "$receiver.profile.startup.stage",
                            "Unknown",
                          ],
                        },
                      },
                    },
                  },
                  {
                    label: {
                      $cond: {
                        if: { $eq: ["$receiver.userType", "investor"] },
                        then: "Previous Investments",
                        else: "Amount Raised",
                      },
                    },
                    value: {
                      $cond: {
                        if: { $eq: ["$receiver.userType", "investor"] },
                        then: {
                          $ifNull: [
                            "$receiver.profile.investor.numberOfPreviousInvestments",
                            0,
                          ],
                        },
                        else: {
                          $ifNull: [
                            "$receiver.profile.startup.amountRaised",
                            0,
                          ],
                        },
                      },
                    },
                  },
                  {
                    label: {
                      $cond: {
                        if: { $eq: ["$receiver.userType", "investor"] },
                        then: "Areas of Expertise",
                        else: "Previous Funding",
                      },
                    },
                    value: {
                      $cond: {
                        if: { $eq: ["$receiver.userType", "investor"] },
                        then: {
                          $ifNull: [
                            "$receiver.profile.investor.areasOfExpertise",
                            [],
                          ],
                        },
                        else: {
                          $ifNull: [
                            "$receiver.profile.startup.previousFunding",
                            0,
                          ],
                        },
                      },
                    },
                  },
                ],
                industries: {
                  $cond: {
                    if: { $eq: ["$receiver.userType", "investor"] },
                    then: {
                      $ifNull: [
                        "$receiver.profile.investor.investmentCriteria.industries",
                        [],
                      ],
                    },
                    else: [
                      "$receiver.profile.startup.industry1",
                      "$receiver.profile.startup.industry2",
                    ],
                  },
                },
                totalRequired: {
                  $cond: {
                    if: { $eq: ["$receiver.userType", "startup"] },
                    then: {
                      $ifNull: [
                        "$receiver.profile.startup.fundingGoal.amount",
                        0,
                      ],
                    },
                    else: null,
                  },
                },
                minPerInvestor: {
                  $cond: {
                    if: { $eq: ["$receiver.userType", "startup"] },
                    then: {
                      $ifNull: [
                        "$receiver.profile.startup.minInvestmentPerInvestor",
                        0,
                      ],
                    },
                    else: null,
                  },
                },
                investmentRange: {
                  $cond: {
                    if: { $eq: ["$receiver.userType", "investor"] },
                    then: {
                      $ifNull: [
                        "$receiver.profile.investor.investmentCriteria.investmentRange",
                        { min: 0, max: 0 },
                      ],
                    },
                    else: null,
                  },
                },
                successPrediction: {
                  $cond: {
                    if: { $eq: ["$receiver.userType", "startup"] },
                    then: {
                      $ifNull: [
                        "$receiver.profile.startup.successPrediction",
                        { score: null, details: null },
                      ],
                    },
                    else: null,
                  },
                },
                interactionId: "$_id",
                status: "$status",
                createdAt: "$createdAt",
                expiresAt: "$expiresAt",
              },
              else: {
                // User is the receiver, show sender's data (startup for investor, investor for startup)
                id: { $ifNull: ["$sender._id", null] },
                profilePic: { $ifNull: ["$sender.profilePicture", null] },
                coverPic: { $ifNull: ["$sender.coverPicture", null] },
                name: {
                  $cond: {
                    if: { $eq: ["$sender.userType", "investor"] },
                    then: {
                      $concat: [
                        { $ifNull: ["$sender.firstName", ""] },
                        " ",
                        { $ifNull: ["$sender.lastName", ""] },
                      ],
                    },
                    else: {
                      $ifNull: [
                        "$sender.profile.startup.pitchTitle",
                        "Untitled",
                      ],
                    },
                  },
                },
                executive: {
                  $cond: {
                    if: { $eq: ["$sender.userType", "startup"] },
                    then: {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            "$sender.profile.startup.team.name",
                            0,
                          ],
                        },
                        "Unknown",
                      ],
                    },
                    else: null,
                  },
                },
                location: {
                  country: {
                    $ifNull: [
                      {
                        $ifNull: [
                          "$sender.profile.startup.location.country",
                          "$sender.location.country",
                        ],
                      },
                      "Unknown",
                    ],
                  },
                  city: {
                    $ifNull: [
                      {
                        $ifNull: [
                          "$sender.profile.startup.location.city",
                          "$sender.location.city",
                        ],
                      },
                      "Unknown",
                    ],
                  },
                },
                description: {
                  $ifNull: [
                    {
                      $ifNull: [
                        "$sender.profile.startup.description",
                        "$sender.profile.investor.bio",
                      ],
                    },
                    "No description",
                  ],
                },
                keyPoints: [
                  {
                    label: {
                      $cond: {
                        if: { $eq: ["$sender.userType", "investor"] },
                        then: "Investor Type",
                        else: "Stage",
                      },
                    },
                    value: {
                      $cond: {
                        if: { $eq: ["$sender.userType", "investor"] },
                        then: {
                          $ifNull: [
                            "$sender.profile.investor.investorType",
                            "Unknown",
                          ],
                        },
                        else: {
                          $ifNull: ["$sender.profile.startup.stage", "Unknown"],
                        },
                      },
                    },
                  },
                  {
                    label: {
                      $cond: {
                        if: { $eq: ["$sender.userType", "investor"] },
                        then: "Previous Investments",
                        else: "Amount Raised",
                      },
                    },
                    value: {
                      $cond: {
                        if: { $eq: ["$sender.userType", "investor"] },
                        then: {
                          $ifNull: [
                            "$sender.profile.investor.numberOfPreviousInvestments",
                            0,
                          ],
                        },
                        else: {
                          $ifNull: ["$sender.profile.startup.amountRaised", 0],
                        },
                      },
                    },
                  },
                  {
                    label: {
                      $cond: {
                        if: { $eq: ["$sender.userType", "investor"] },
                        then: "Areas of Expertise",
                        else: "Previous Funding",
                      },
                    },
                    value: {
                      $cond: {
                        if: { $eq: ["$sender.userType", "investor"] },
                        then: {
                          $ifNull: [
                            "$sender.profile.investor.areasOfExpertise",
                            [],
                          ],
                        },
                        else: {
                          $ifNull: [
                            "$sender.profile.startup.previousFunding",
                            0,
                          ],
                        },
                      },
                    },
                  },
                ],
                industries: {
                  $cond: {
                    if: { $eq: ["$sender.userType", "investor"] },
                    then: {
                      $ifNull: [
                        "$sender.profile.investor.investmentCriteria.industries",
                        [],
                      ],
                    },
                    else: [
                      "$sender.profile.startup.industry1",
                      "$sender.profile.startup.industry2",
                    ],
                  },
                },
                totalRequired: {
                  $cond: {
                    if: { $eq: ["$sender.userType", "startup"] },
                    then: {
                      $ifNull: [
                        "$sender.profile.startup.fundingGoal.amount",
                        0,
                      ],
                    },
                    else: null,
                  },
                },
                minPerInvestor: {
                  $cond: {
                    if: { $eq: ["$sender.userType", "startup"] },
                    then: {
                      $ifNull: [
                        "$sender.profile.startup.minInvestmentPerInvestor",
                        0,
                      ],
                    },
                    else: null,
                  },
                },
                investmentRange: {
                  $cond: {
                    if: { $eq: ["$sender.userType", "investor"] },
                    then: {
                      $ifNull: [
                        "$sender.profile.investor.investmentCriteria.investmentRange",
                        { min: 0, max: 0 },
                      ],
                    },
                    else: null,
                  },
                },
                successPrediction: {
                  $cond: {
                    if: { $eq: ["$sender.userType", "startup"] },
                    then: {
                      $ifNull: [
                        "$sender.profile.startup.successPrediction",
                        { score: null, details: null },
                      ],
                    },
                    else: null,
                  },
                },
                interactionId: "$_id",
                status: "$status",
                createdAt: "$createdAt",
                expiresAt: "$expiresAt",
              },
            },
          },
        },
      },
      {
        $project: {
          cardData: {
            $cond: {
              if: { $eq: ["$cardData.id", null] },
              then: null, // Exclude if no valid user data
              else: "$cardData",
            },
          },
        },
      },
      {
        $match: {
          cardData: { $ne: null }, // Filter out null cardData
        },
      },
      {
        $sort: { "cardData.createdAt": -1 }, // Sort by creation date, newest first
      },
    ];

    // Execute aggregation
    const interactions = await Interaction.aggregate(pipeline);

    // Format the response to extract cardData
    const formattedResponse = interactions
      .filter((interaction) => interaction.cardData)
      .map((interaction) => ({
        ...interaction.cardData,
        industries: interaction.cardData.industries.filter(Boolean), // Remove null/undefined industries
      }));

    logger.debug("Interactions query executed", {
      userId,
      userType: user.userType,
      interactionsFound: interactions.length,
      formattedInteractions: formattedResponse.length,
      interactions: formattedResponse.map((i) => ({
        _id: i.interactionId,
        sender: i.sender || i.id,
        receiver: i.receiver || i.id,
        status: i.status,
        createdAt: i.createdAt,
      })),
    });

    if (!formattedResponse.length) {
      return sendResponse(res, 200, [], "No accepted interactions found");
    }

    sendResponse(
      res,
      200,
      formattedResponse,
      "Interactions retrieved successfully"
    );
  } catch (error) {
    logger.error("Get interactions error", {
      message: error.message,
      stack: error.stack,
      userId: req.user.id,
    });
    sendResponse(res, 400, null, error.message);
  }
}

/**
 * Get user's pending interactions
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with pending interactions
 */
async function getPendingInteractions(req, res) {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("+userType");
    if (!user) throw new Error("User not found");

    // Update expired interactions
    await Interaction.updateMany(
      {
        expiresAt: { $lte: new Date() },
        status: "pending",
      },
      { $set: { status: "expired" } }
    );

    let pipeline;
    if (user.userType === "investor") {
      // For investors, get pending interactions where they are the receiver (nudges from startups)
      pipeline = [
        {
          $match: {
            receiver: new mongoose.Types.ObjectId(userId),
            status: "pending",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "sender",
          },
        },
        {
          $unwind: {
            path: "$sender",
            preserveNullAndEmptyArrays: true, // Keep interactions even if sender is not found
          },
        },
        {
          $match: {
            $or: [
              { "sender.userType": "startup" },
              { sender: { $exists: false } },
            ],
          },
        },
        {
          $project: {
            cardData: {
              id: { $ifNull: ["$sender._id", null] },
              profilePic: { $ifNull: ["$sender.profilePicture", null] },
              coverPic: { $ifNull: ["$sender.coverPicture", null] },
              executive: {
                $ifNull: [
                  { $arrayElemAt: ["$sender.profile.startup.team.name", 0] },
                  "Unknown",
                ],
              },
              title: {
                $ifNull: ["$sender.profile.startup.pitchTitle", "Untitled"],
              },
              location: {
                country: {
                  $ifNull: [
                    "$sender.profile.startup.location.country",
                    "Unknown",
                  ],
                },
                city: {
                  $ifNull: ["$sender.profile.startup.location.city", "Unknown"],
                },
              },
              description: {
                $ifNull: [
                  "$sender.profile.startup.description",
                  "No description",
                ],
              },
              keyPoints: [
                {
                  label: "Stage",
                  value: {
                    $ifNull: ["$sender.profile.startup.stage", "Unknown"],
                  },
                },
                {
                  label: "Amount Raised",
                  value: {
                    $ifNull: ["$sender.profile.startup.amountRaised", 0],
                  },
                },
                {
                  label: "Previous Funding",
                  value: {
                    $ifNull: ["$sender.profile.startup.previousFunding", 0],
                  },
                },
              ],
              totalRequired: {
                $ifNull: ["$sender.profile.startup.fundingGoal.amount", 0],
              },
              minPerInvestor: {
                $ifNull: [
                  "$sender.profile.startup.minInvestmentPerInvestor",
                  0,
                ],
              },
              industries: [
                "$sender.profile.startup.industry1",
                "$sender.profile.startup.industry2",
              ],
              successPrediction: {
                $ifNull: [
                  "$sender.profile.startup.successPrediction",
                  { score: null, details: null },
                ],
              },
              interactionId: "$_id",
              status: "$status",
              createdAt: "$createdAt",
              expiresAt: "$expiresAt",
              amount: "$amount",
              message: { $ifNull: ["$message", null] },
            },
          },
        },
      ];
    } else if (user.userType === "startup") {
      // For startups, get pending interactions where they are the receiver (connections from investors)
      pipeline = [
        {
          $match: {
            receiver: new mongoose.Types.ObjectId(userId),
            status: "pending",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "sender",
            foreignField: "_id",
            as: "sender",
          },
        },
        {
          $unwind: {
            path: "$sender",
            preserveNullAndEmptyArrays: true, // Keep interactions even if sender is not found
          },
        },
        {
          $match: {
            $or: [
              { "sender.userType": "investor" },
              { sender: { $exists: false } },
            ],
          },
        },
        {
          $project: {
            cardData: {
              id: { $ifNull: ["$sender._id", null] },
              profilePic: { $ifNull: ["$sender.profilePicture", null] },
              coverPic: { $ifNull: ["$sender.coverPicture", null] },
              name: {
                $concat: [
                  { $ifNull: ["$sender.firstName", ""] },
                  " ",
                  { $ifNull: ["$sender.lastName", ""] },
                ],
              },
              location: {
                country: {
                  $ifNull: ["$sender.location.country", "Unknown"],
                },
                city: {
                  $ifNull: ["$sender.location.city", "Unknown"],
                },
              },
              description: {
                $ifNull: ["$sender.profile.investor.bio", "No description"],
              },
              keyPoints: [
                {
                  label: "Investor Type",
                  value: {
                    $ifNull: [
                      "$sender.profile.investor.investorType",
                      "Unknown",
                    ],
                  },
                },
                {
                  label: "Previous Investments",
                  value: {
                    $ifNull: [
                      "$sender.profile.investor.numberOfPreviousInvestments",
                      0,
                    ],
                  },
                },
                {
                  label: "Areas of Expertise",
                  value: {
                    $ifNull: ["$sender.profile.investor.areasOfExpertise", []],
                  },
                },
              ],
              industries: {
                $ifNull: [
                  "$sender.profile.investor.investmentCriteria.industries",
                  [],
                ],
              },
              investmentRange: {
                $ifNull: [
                  "$sender.profile.investor.investmentCriteria.investmentRange",
                  { min: 0, max: 0 },
                ],
              },
              interactionId: "$_id",
              status: "$status",
              createdAt: "$createdAt",
              expiresAt: "$expiresAt",
              amount: "$amount",
              message: { $ifNull: ["$message", null] },
            },
          },
        },
      ];
    } else {
      throw new Error(
        "Only investors and startups can view pending interactions"
      );
    }

    // Execute aggregation
    const interactions = await Interaction.aggregate(pipeline);

    // Format the response to extract cardData
    const formattedResponse = interactions
      .filter((interaction) => interaction.cardData)
      .map((interaction) => ({
        ...interaction.cardData,
        industries: interaction.cardData.industries.filter(Boolean), // Remove null/undefined industries
      }));

    logger.debug("Pending interactions query executed", {
      userId,
      userType: user.userType,
      interactionsFound: interactions.length,
      formattedInteractions: formattedResponse.length,
      interactions: formattedResponse.map((i) => ({
        _id: i.interactionId,
        sender: i.sender || i.id,
        receiver: i.receiver || i.id,
        status: i.status,
        expiresAt: i.expiresAt,
      })),
    });

    if (!formattedResponse.length) {
      return sendResponse(res, 200, [], "No pending interactions found");
    }

    sendResponse(
      res,
      200,
      formattedResponse,
      "Pending interactions retrieved successfully"
    );
  } catch (error) {
    logger.error("Get pending interactions error", {
      message: error.message,
      stack: error.stack,
      userId: req.user.id,
    });
    sendResponse(res, 400, null, error.message);
  }
}

/**
 * Get investor's interaction history
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a response with sent and received interactions
 */
async function getHistory(req, res) {
  try {
    const userId = req.user.id;
    const user = await Investor.findById(userId);
    if (!user || user.userType !== "investor") {
      throw new Error("Only investors can view interaction history");
    }

    // Update expired interactions
    await Interaction.updateMany(
      {
        expiresAt: { $lte: new Date() },
        status: "pending",
      },
      { $set: { status: "expired" } }
    );

    const sentInteractions = await Interaction.find({ sender: userId })
      .populate("receiver", "firstName lastName profilePicture userType")
      .lean();
    const receivedInteractions = await Interaction.find({ receiver: userId })
      .populate("sender", "firstName lastName profilePicture userType")
      .lean();

    logger.debug("Interaction history retrieved", {
      userId,
      sentCount: sentInteractions.length,
      receivedCount: receivedInteractions.length,
      sentInteractions: sentInteractions.map((i) => ({
        _id: i._id,
        receiver: i.receiver?._id || i.receiver,
        status: i.status,
      })),
      receivedInteractions: receivedInteractions.map((i) => ({
        _id: i._id,
        sender: i.sender?._id || i.sender,
        status: i.status,
      })),
    });

    sendResponse(
      res,
      200,
      { sent: sentInteractions, received: receivedInteractions },
      "History retrieved successfully"
    );
  } catch (error) {
    logger.error("Get history error", {
      message: error.message,
      stack: error.stack,
      userId: req.user.id,
    });
    sendResponse(res, 400, null, error.message);
  }
}

/**
 * Delete a specific interaction
 * @function
 * @async
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} Sends a 204 response on successful deletion
 */
async function deleteInteraction(req, res) {
  try {
    const { id: interactionId } = req.params;
    const userId = req.user.id;

    // Validate ObjectId
    if (!mongoose.isValidObjectId(interactionId)) {
      throw new Error("Invalid interaction ID");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find the interaction and verify user is sender or receiver
      const interaction = await Interaction.findOne({
        _id: interactionId,
        $or: [{ sender: userId }, { receiver: userId }],
      }).session(session);

      if (!interaction) {
        throw new Error("Interaction not found or unauthorized");
      }

      logger.debug("Interaction found for deletion", {
        interactionId,
        userId,
        sender: interaction.sender.toString(),
        receiver: interaction.receiver.toString(),
        status: interaction.status,
      });

      // Delete the interaction
      await Interaction.deleteOne({ _id: interactionId }).session(session);

      await session.commitTransaction();
      logger.info("Interaction deleted", { interactionId, userId });

      sendResponse(res, 204, null, "Interaction deleted successfully");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error("Delete interaction error", {
      message: error.message,
      stack: error.stack,
      interactionId: req.params.id,
      userId: req.user.id,
    });
    sendResponse(res, 400, null, error.message);
  }
}

module.exports = {
  sendInteraction,
  updateInteraction,
  getInteractions,
  getPendingInteractions,
  getHistory,
  deleteInteraction,
};
