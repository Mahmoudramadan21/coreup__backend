const { body, validationResult } = require("express-validator");

// Validator for creating a new job, aligned with Job schema
exports.validateCreateJob = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Job title is required")
    .isLength({ max: 100 })
    .withMessage("Job title cannot exceed 100 characters"),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .isLength({ max: 10 })
    .withMessage("Maximum 10 tags allowed"),
  body("jobRole")
    .trim()
    .notEmpty()
    .withMessage("Job role is required")
    .isIn(["Developer", "Designer", "Manager", "Analyst", "Engineer", "Other"])
    .withMessage("Invalid job role"),
  body("salary.min")
    .isNumeric()
    .withMessage("Minimum salary must be a number")
    .custom((value) => value >= 0)
    .withMessage("Minimum salary cannot be negative"),
  body("salary.max")
    .isNumeric()
    .withMessage("Maximum salary must be a number")
    .custom((value, { req }) => value >= req.body.salary.min)
    .withMessage(
      "Maximum salary must be greater than or equal to minimum salary"
    ),
  body("salary.type")
    .notEmpty()
    .withMessage("Salary type is required")
    .isIn(["hourly", "monthly", "yearly"])
    .withMessage("Invalid salary type"),
  body("education")
    .notEmpty()
    .withMessage("Education level is required")
    .isIn(["High School", "Bachelor", "Master", "PhD", "Diploma", "Other"])
    .withMessage("Invalid education level"),
  body("experience")
    .notEmpty()
    .withMessage("Experience level is required")
    .isIn(["Entry Level", "Mid Level", "Senior Level", "Executive"])
    .withMessage("Invalid experience level"),
  body("jobType")
    .notEmpty()
    .withMessage("Job type is required")
    .isIn(["full-time", "part-time", "remote", "contract"])
    .withMessage("Invalid job type"),
  body("vacancies")
    .isInt({ min: 1 })
    .withMessage("At least one vacancy is required"),
  body("expirationDate")
    .isISO8601()
    .withMessage("Expiration date must be a valid date")
    .custom((value) => new Date(value) > new Date())
    .withMessage("Expiration date must be in the future"),
  body("applyMethod")
    .notEmpty()
    .withMessage("Apply method is required")
    .isIn(["external", "email"])
    .withMessage("Invalid apply method"),
  body("applyDetails")
    .if(body("applyMethod").isIn(["external", "email"]))
    .notEmpty()
    .withMessage("Apply details are required")
    .custom((value, { req }) => {
      if (req.body.applyMethod === "external") {
        return /^https?:\/\/.+$/.test(value);
      }
      if (req.body.applyMethod === "email") {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
      return true;
    })
    .withMessage("Invalid apply details (URL or email required)"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Job description is required")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("responsibilities")
    .isArray({ min: 1 })
    .withMessage("At least one responsibility is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: errors.array()[0].msg,
      });
    }
    next();
  },
];

// Validator for updating a job, aligned with Job schema (all fields optional)
exports.validateUpdateJob = [
  body("title")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Job title cannot exceed 100 characters"),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array")
    .isLength({ max: 10 })
    .withMessage("Maximum 10 tags allowed"),
  body("jobRole")
    .optional()
    .trim()
    .isIn(["Developer", "Designer", "Manager", "Analyst", "Engineer", "Other"])
    .withMessage("Invalid job role"),
  body("salary.min")
    .optional()
    .isNumeric()
    .withMessage("Minimum salary must be a number")
    .custom((value) => value >= 0)
    .withMessage("Minimum salary cannot be negative"),
  body("salary.max")
    .optional()
    .isNumeric()
    .withMessage("Maximum salary must be a number")
    .custom((value, { req }) => {
      if (req.body.salary?.min !== undefined) {
        return value >= req.body.salary.min;
      }
      return true;
    })
    .withMessage(
      "Maximum salary must be greater than or equal to minimum salary"
    ),
  body("salary.type")
    .optional()
    .isIn(["hourly", "monthly", "yearly"])
    .withMessage("Invalid salary type"),
  body("education")
    .optional()
    .isIn(["High School", "Bachelor", "Master", "PhD", "Diploma", "Other"])
    .withMessage("Invalid education level"),
  body("experience")
    .optional()
    .isIn(["Entry Level", "Mid Level", "Senior Level", "Executive"])
    .withMessage("Invalid experience level"),
  body("jobType")
    .optional()
    .isIn(["full-time", "part-time", "remote", "contract"])
    .withMessage("Invalid job type"),
  body("vacancies")
    .optional()
    .isInt({ min: 1 })
    .withMessage("At least one vacancy is required"),
  body("expirationDate")
    .optional()
    .isISO8601()
    .withMessage("Expiration date must be a valid date")
    .custom((value) => new Date(value) > new Date())
    .withMessage("Expiration date must be in the future"),
  body("applyMethod")
    .optional()
    .isIn(["external", "email"])
    .withMessage("Invalid apply method"),
  body("applyDetails")
    .optional()
    .if(body("applyMethod").exists())
    .notEmpty()
    .withMessage("Apply details are required when applyMethod is provided")
    .custom((value, { req }) => {
      if (req.body.applyMethod === "external") {
        return /^https?:\/\/.+$/.test(value);
      }
      if (req.body.applyMethod === "email") {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      }
      return true;
    })
    .withMessage("Invalid apply details (URL or email required)"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("responsibilities")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one responsibility is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        data: null,
        message: errors.array()[0].msg,
      });
    }
    next();
  },
];
