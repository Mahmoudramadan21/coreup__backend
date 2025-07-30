const Joi = require("joi");
const { sendResponse } = require("../utils/response");

const industriesList = [
  "Agriculture",
  "Business Services",
  "Education & Training",
  "Energy & Natural Resources",
  "Entertainment & Leisure",
  "Fashion & Beauty",
  "Finance",
  "Food & Beverage",
  "Hospitality, Restaurants & Bars",
  "Manufacturing & Engineering",
  "Media",
  "Medical & Sciences",
  "Personal Services",
  "Products & Inventions",
  "Property",
  "Retail",
  "Sales & Marketing",
  "Software",
  "Technology",
  "Transportation",
];

/**
 * Validation schemas for API requests
 * @namespace schemas
 */
const schemas = {
  /**
   * Schema for user registration
   */
  register: Joi.object({
    firstName: Joi.string().required().messages({
      "string.empty": "First name is required",
    }),
    lastName: Joi.string().required().messages({
      "string.empty": "Last name is required",
    }),
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email",
      "string.empty": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters",
      "string.empty": "Password is required",
    }),
    userType: Joi.string()
      .valid("jobseeker", "investor", "startup", "admin")
      .required()
      .messages({
        "any.only":
          "User type must be one of: jobseeker, investor, startup, admin",
        "string.empty": "User type is required",
      }),
    profile: Joi.object({
      startup: Joi.when("userType", {
        is: "startup",
        then: Joi.object({
          name: Joi.string().required().messages({
            "any.required": "Startup name is required",
          }),
          industry: Joi.string().required().messages({
            "any.required": "Industry is required",
          }),
          description: Joi.string().required().messages({
            "any.required": "Description is required",
          }),
          fundingGoal: Joi.object({
            amount: Joi.number().min(0).required().messages({
              "any.required": "Funding goal amount is required",
            }),
            currency: Joi.string().default("USD"),
          }).required(),
          stage: Joi.string()
            .valid("idea", "prototype", "mvp", "scaling")
            .required()
            .messages({
              "any.required": "Stage is required",
              "any.only": "Stage must be one of idea, prototype, mvp, scaling",
            }),
          location: Joi.object({
            country: Joi.string().optional(),
            city: Joi.string().optional(),
          }).optional(),
          team: Joi.array()
            .items(
              Joi.object({
                name: Joi.string().optional(),
                role: Joi.string().optional(),
              })
            )
            .optional(),
          pitchDeck: Joi.string().optional(),
        }).required(),
        otherwise: Joi.forbidden().messages({
          "any.forbidden": "Startup profile is not allowed for this user type",
        }),
      }),
      investor: Joi.when("userType", {
        is: "investor",
        then: Joi.object({
          investmentCriteria: Joi.object({
            industries: Joi.array()
              .items(Joi.string().valid(...industriesList))
              .length(3)
              .required()
              .messages({
                "array.length": "Exactly 3 industries must be selected",
                "any.only": "Invalid industry selected",
                "array.base": "Industries must be an array",
                "any.required": "Industries are required",
              }),
            locations: Joi.array()
              .items(
                Joi.object({
                  country: Joi.string().trim().required().messages({
                    "string.empty": "Country is required",
                  }),
                  city: Joi.string().trim().required().messages({
                    "string.empty": "City is required",
                  }),
                })
              )
              .min(1)
              .required()
              .messages({
                "array.base": "Locations must be an array",
                "array.min": "At least one location is required",
                "any.required": "Locations are required",
              }),
            investmentRange: Joi.object({
              min: Joi.number().min(0).required().messages({
                "number.base": "Minimum investment must be a number",
                "number.min": "Minimum investment must be at least 0",
                "any.required": "Minimum investment is required",
              }),
              max: Joi.number().min(Joi.ref("min")).required().messages({
                "number.base": "Maximum investment must be a number",
                "number.min":
                  "Maximum investment must be greater than or equal to minimum",
                "any.required": "Maximum investment is required",
              }),
            }).required(),
            stage: Joi.string()
              .valid("seed", "early-stage", "growth", "late-stage")
              .optional(),
          }).required(),
          bio: Joi.string().required().messages({
            "string.empty": "Professional background is required",
          }),
          portfolio: Joi.array()
            .items(
              Joi.object({
                company: Joi.string().optional(),
                amount: Joi.number().min(0).optional(),
                date: Joi.date().optional(),
              })
            )
            .optional(),
          linkedIn: Joi.string()
            .uri()
            .pattern(/linkedin\.com/)
            .optional(),
          website: Joi.string().uri().optional(),
        }).required(),
        otherwise: Joi.forbidden().messages({
          "any.forbidden": "Investor profile is not allowed for this user type",
        }),
      }),
      jobseeker: Joi.when("userType", {
        is: "jobseeker",
        then: Joi.object({
          skills: Joi.array().items(Joi.string()).optional(),
          experiences: Joi.array()
            .items(
              Joi.object({
                title: Joi.string().optional(),
                company: Joi.string().optional(),
                location: Joi.object({
                  country: Joi.string().optional(),
                  city: Joi.string().optional(),
                }).optional(),
                startDate: Joi.date().optional(),
                endDate: Joi.date().optional(),
                description: Joi.string().optional(),
              })
            )
            .optional(),
        }).required(),
        otherwise: Joi.forbidden().messages({
          "any.forbidden":
            "Jobseeker profile is not allowed for this user type",
        }),
      }),
    })
      .required()
      .messages({
        "any.required": "Profile data is required",
      }),
  }),

  /**
   * Schema for user login
   */
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  /**
   * Schema for jobseeker registration with CV
   */
  registerCV: Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
  }),
  /**
   * Schema for creating a job
   */
  createJob: Joi.object({
    title: Joi.string().required(),
    description: Joi.string().required(),
    location: Joi.object({
      country: Joi.string().required(),
      city: Joi.string().required(),
      area: Joi.string().optional(),
    }).required(),
    jobType: Joi.string()
      .valid("full-time", "part-time", "remote", "contract")
      .required(),
    salary: Joi.object({
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional(),
      currency: Joi.string().default("USD"),
    }).optional(),
    requirements: Joi.array().items(Joi.string()).optional(),
  }),
  /**
   * Schema for updating a job
   */
  updateJob: Joi.object({
    title: Joi.string().optional(),
    description: Joi.string().optional(),
    location: Joi.object({
      country: Joi.string().optional(),
      city: Joi.string().optional(),
      area: Joi.string().optional(),
    }).optional(),
    jobType: Joi.string()
      .valid("full-time", "part-time", "remote", "contract")
      .optional(),
    salary: Joi.object({
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional(),
      currency: Joi.string().optional(),
    }).optional(),
    requirements: Joi.array().items(Joi.string()).optional(),
  }),
  /**
   * Schema for applying to a job
   */
  applyForJob: Joi.object({
    jobId: Joi.string().required(),
    coverLetter: Joi.string().optional(),
    cv: Joi.any().required(),
  }),
  /**
   * Schema for updating job application status
   */
  updateApplicationStatus: Joi.object({
    status: Joi.string().valid("pending", "accepted", "rejected").required(),
  }),
  /**
   * Schema for contact form submission
   */
  contact: Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional(),
    message: Joi.string().required(),
  }),
  /**
   * Schema for updating contact status
   */
  updateContactStatus: Joi.object({
    status: Joi.string().valid("open", "resolved").required(),
  }),
  /**
   * Schema for updating user profile
   */
  updateProfile: Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    phone: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional(),
    birthdate: Joi.object({
      day: Joi.number().min(1).max(31).optional(),
      month: Joi.string()
        .valid(
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec"
        )
        .optional(),
      year: Joi.number().min(1900).max(new Date().getFullYear()).optional(),
    }).optional(),
    gender: Joi.string().valid("male", "female", "other").optional(),
    nationality: Joi.string().optional(),
    location: Joi.object({
      country: Joi.string().optional(),
      city: Joi.string().optional(),
      area: Joi.string().optional(),
    }).optional(),
    profile: Joi.object({
      jobseeker: Joi.when(Joi.ref("/userType"), {
        is: "jobseeker",
        then: Joi.object({
          skills: Joi.array().items(Joi.string()).optional(),
          experiences: Joi.array()
            .items(
              Joi.object({
                title: Joi.string().required(),
                company: Joi.string().required(),
                location: Joi.object({
                  country: Joi.string().optional(),
                  city: Joi.string().optional(),
                }).optional(),
                startDate: Joi.date().required(),
                endDate: Joi.date().optional(),
                description: Joi.string().optional(),
              })
            )
            .optional(),
        }).optional(),
      }),
      investor: Joi.when(Joi.ref("/userType"), {
        is: "investor",
        then: Joi.object({
          bio: Joi.string().optional(),
          portfolio: Joi.array()
            .items(
              Joi.object({
                company: Joi.string().required(),
                amount: Joi.number().min(0).required(),
                date: Joi.date().required(),
              })
            )
            .optional(),
          linkedIn: Joi.string()
            .uri()
            .pattern(/linkedin\.com/)
            .optional(),
          website: Joi.string().uri().optional(),
          investmentCriteria: Joi.object({
            industries: Joi.array()
              .items(Joi.string().valid(...industriesList))
              .length(3)
              .required()
              .messages({
                "array.length": "Exactly 3 industries must be selected",
                "any.only": "Invalid industry selected",
                "array.base": "Industries must be an array",
                "any.required": "Industries are required",
              }),
            locations: Joi.array()
              .items(
                Joi.object({
                  country: Joi.string().trim().required().messages({
                    "string.empty": "Country is required",
                  }),
                  city: Joi.string().trim().required().messages({
                    "string.empty": "City is required",
                  }),
                })
              )
              .min(1)
              .required()
              .messages({
                "array.base": "Locations must be an array",
                "array.min": "At least one location is required",
                "any.required": "Locations are required",
              }),
            investmentRange: Joi.object({
              min: Joi.number()
                .custom((value, helpers) => {
                  return Number(value);
                })
                .min(0)
                .required()
                .messages({
                  "number.base": "Minimum investment must be a number",
                  "number.min": "Minimum investment must be at least 0",
                  "any.required": "Minimum investment is required",
                }),
              max: Joi.number()
                .custom((value, helpers) => {
                  return Number(value);
                })
                .min(Joi.ref("min"))
                .required()
                .messages({
                  "number.base": "Maximum investment must be a number",
                  "number.min":
                    "Maximum investment must be greater than or equal to minimum",
                  "any.required": "Maximum investment is required",
                }),
            }).required(),
            stage: Joi.string()
              .valid("seed", "early-stage", "growth", "late-stage")
              .optional(),
          }).required(),
        }).optional(),
      }),
      startup: Joi.when(Joi.ref("/userType"), {
        is: "startup",
        then: Joi.object({
          name: Joi.string().required(),
          industry: Joi.string().required(),
          location: Joi.object({
            country: Joi.string().required(),
            city: Joi.string().required(),
          }).required(),
          description: Joi.string().required(),
          fundingGoal: Joi.object({
            amount: Joi.number().min(0).required(),
            currency: Joi.string().default("USD"),
          }).required(),
          stage: Joi.string()
            .valid("idea", "prototype", "mvp", "scaling")
            .required(),
          team: Joi.array()
            .items(
              Joi.object({
                name: Joi.string().required(),
                role: Joi.string().required(),
              })
            )
            .required(),
        }).optional(),
      }),
    }).optional(),
  }),
  /**
   * Schema for adding jobseeker experience
   */
  experience: Joi.object({
    title: Joi.string().required(),
    company: Joi.string().required(),
    location: Joi.object({
      country: Joi.string().optional(),
      city: Joi.string().optional(),
    }).optional(),
    startDate: Joi.date().required(),
    endDate: Joi.date().optional(),
    description: Joi.string().optional(),
  }),
  /**
   * Schema for sending a message
   */
  sendMessage: Joi.object({
    receiverId: Joi.string().required(),
    roomId: Joi.string().required(),
    message: Joi.string().required(),
    type: Joi.string().valid("text", "file").optional(),
  }),
  /**
   * Schema for requesting password reset
   */
  requestPasswordReset: Joi.object({
    email: Joi.string().email().required(),
  }),
  /**
   * Schema for resetting password
   */
  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
  }),
  /**
   * Schema for creating payment intent
   */
  createPaymentIntent: Joi.object({
    amount: Joi.number().min(0).required(),
    currency: Joi.string().default("usd"),
  }),
  /**
   * Schema for confirming payment
   */
  confirmPayment: Joi.object({
    paymentIntentId: Joi.string().required(),
  }),
};

/**
 * Middleware to validate request body using Joi schemas
 * @function
 * @param {string} schemaName - Name of the schema to validate against
 * @returns {Function} Express middleware function
 */
const validate = (schemaName) => (req, res, next) => {
  console.log(
    "Request body before validation:",
    JSON.stringify(req.body, null, 2)
  );
  console.log("Validation context userType:", req.body.userType);
  const { error, value } = schemas[schemaName].validate(req.body, {
    abortEarly: false,
    context: { userType: req.body.userType },
    convert: true,
  });
  if (error) {
    const errors = error.details.map((detail) => detail.message).join(", ");
    console.log("Validation errors:", errors);
    return sendResponse(res, 400, null, errors);
  }
  console.log("Request body after validation:", JSON.stringify(value, null, 2));
  req.body = value; // Update req.body with validated data
  next();
};

module.exports = { validate };
