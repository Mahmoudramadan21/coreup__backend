const { body, validationResult } = require("express-validator");

const validateRegister = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name cannot exceed 50 characters"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name cannot exceed 50 characters"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("userType")
    .isIn(["jobseeker", "investor", "startup", "admin"])
    .withMessage("Invalid user type"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateRegisterCV = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name cannot exceed 50 characters"),
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name cannot exceed 50 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateLogin = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateRequestPasswordReset = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateVerifyCode = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("verificationCode")
    .matches(/^\d{4}$/)
    .withMessage("Verification code must be a 4-digit number"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateResetPassword = [
  body("resetToken").notEmpty().withMessage("Reset token is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateChangePassword = [
  body("oldPassword").notEmpty().withMessage("Old password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateJobseekerDetails = [
  body("birthdate").notEmpty().withMessage("Birthdate is required"),
  body("birthdate.day")
    .isInt({ min: 1, max: 31 })
    .withMessage("Day must be between 1 and 31"),
  body("birthdate.month")
    .isIn([
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
      "Dec",
    ])
    .withMessage("Invalid month"),
  body("birthdate.year")
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage("Invalid year"),
  body("nationality")
    .notEmpty()
    .withMessage("Nationality is required")
    .isLength({ max: 50 })
    .withMessage("Nationality cannot exceed 50 characters"),
  body("location.country")
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ max: 50 })
    .withMessage("Country cannot exceed 50 characters"),
  body("location.city")
    .notEmpty()
    .withMessage("City is required")
    .isLength({ max: 50 })
    .withMessage("City cannot exceed 50 characters"),
  body("location.area")
    .notEmpty()
    .withMessage("Area is required")
    .isLength({ max: 50 })
    .withMessage("Area cannot exceed 50 characters"),
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid phone number"),
  body("profile.jobseeker.yearsOfExperience")
    .notEmpty()
    .withMessage("Years of experience is required")
    .isInt({ min: 0 })
    .withMessage("Years of experience must be a non-negative number"),
  body("profile.jobseeker.education")
    .isArray({ min: 1 })
    .withMessage("At least one education entry is required"),
  body("profile.jobseeker.education.*.degree")
    .notEmpty()
    .withMessage("Degree name is required")
    .isLength({ max: 100 })
    .withMessage("Degree name cannot exceed 100 characters"),
  body("profile.jobseeker.education.*.major")
    .notEmpty()
    .withMessage("Major name is required")
    .isLength({ max: 100 })
    .withMessage("Major name cannot exceed 100 characters"),
  body("profile.jobseeker.education.*.university")
    .notEmpty()
    .withMessage("University name is required")
    .isLength({ max: 100 })
    .withMessage("University name cannot exceed 100 characters"),
  body("profile.jobseeker.education.*.startDate.month")
    .notEmpty()
    .withMessage("Start month is required")
    .isIn([
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
      "Dec",
    ])
    .withMessage("Invalid start month"),
  body("profile.jobseeker.education.*.startDate.year")
    .notEmpty()
    .withMessage("Start year is required")
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage("Invalid start year"),
  body("profile.jobseeker.experiences")
    .isArray({ min: 1 })
    .withMessage("At least one experience entry is required"),
  body("profile.jobseeker.experiences.*.title")
    .notEmpty()
    .withMessage("Experience title is required"),
  body("profile.jobseeker.experiences.*.company")
    .notEmpty()
    .withMessage("Company name is required"),
  body("profile.jobseeker.experiences.*.experienceType")
    .notEmpty()
    .withMessage("Experience type is required")
    .isIn([
      "Full Time",
      "Part Time",
      "Freelance",
      "Internship",
      "Volunteering",
      "Student Activities",
    ])
    .withMessage("Invalid experience type"),
  body("profile.jobseeker.experiences.*.location.country")
    .notEmpty()
    .withMessage("Experience country is required"),
  body("profile.jobseeker.experiences.*.location.city")
    .notEmpty()
    .withMessage("Experience city is required"),
  body("profile.jobseeker.experiences.*.startDate.month")
    .notEmpty()
    .withMessage("Experience start month is required")
    .isIn([
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
      "Dec",
    ])
    .withMessage("Invalid experience start month"),
  body("profile.jobseeker.experiences.*.startDate.year")
    .notEmpty()
    .withMessage("Experience start year is required")
    .isInt({ min: 1900, max: new Date().getFullYear() })
    .withMessage("Invalid experience start year"),
  body("profile.jobseeker.skills")
    .isArray({ min: 1 })
    .withMessage("At least one skill is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.files || !req.files.profilePicture) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Profile picture is required" }] });
    }
    if (!req.files || !req.files.coverPicture) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Cover picture is required" }] });
    }
    next();
  },
];

const validateInvestorDetails = [
  body("bio")
    .notEmpty()
    .withMessage("Bio is required")
    .isLength({ max: 1000 })
    .withMessage("Bio cannot exceed 1000 characters"),
  body("investmentCriteria")
    .notEmpty()
    .withMessage("Investment criteria is required"),
  body("investmentCriteria.industries")
    .isArray({ min: 3, max: 3 })
    .withMessage("Exactly 3 industries are required"),
  body("investmentCriteria.industries.*")
    .isIn([
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
    ])
    .withMessage("Invalid industry"),
  body("investmentCriteria.locations")
    .isArray({ min: 1 })
    .withMessage("At least one location is required"),
  body("investmentCriteria.locations.*.country")
    .notEmpty()
    .withMessage("Location country is required"),
  body("investmentCriteria.locations.*.city")
    .notEmpty()
    .withMessage("Location city is required"),
  body("investmentCriteria.investmentRange.min")
    .notEmpty()
    .withMessage("Minimum investment range is required")
    .isInt({ min: 0 })
    .withMessage("Minimum investment must be a non-negative number"),
  body("investmentCriteria.investmentRange.max")
    .notEmpty()
    .withMessage("Maximum investment range is required")
    .isInt({ min: 0 })
    .withMessage("Maximum investment must be a non-negative number"),
  body("investmentCriteria.stage")
    .isArray({ min: 1 })
    .withMessage("At least one investment stage is required"),
  body("investmentCriteria.stage.*")
    .isIn([
      "Achieving Sales",
      "Breaking Even",
      "MVP/Finished Product",
      "Pre-Startup/R&D",
      "Profitable",
    ])
    .withMessage("Invalid investment stage"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.files || !req.files.profilePicture) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Profile picture is required" }] });
    }
    if (!req.files || !req.files.coverPicture) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Cover picture is required" }] });
    }
    next();
  },
];

const validateStartupDetails = [
  body("pitchTitle")
    .notEmpty()
    .withMessage("Pitch title is required")
    .isLength({ max: 100 })
    .withMessage("Pitch title cannot exceed 100 characters"),
  body("website")
    .optional()
    .matches(/^https?:\/\/.+$/)
    .withMessage("Please provide a valid URL for website"),
  body("mobileNumber")
    .notEmpty()
    .withMessage("Mobile number is required")
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Please provide a valid mobile number"),
  body("industry1").notEmpty().withMessage("Primary industry is required"),
  body("industry2").notEmpty().withMessage("Secondary industry is required"),
  body("stage")
    .notEmpty()
    .withMessage("Stage is required")
    .isIn(["idea", "prototype", "mvp", "scaling"])
    .withMessage("Invalid stage"),
  body("idealInvestorRole")
    .notEmpty()
    .withMessage("Ideal investor role is required")
    .isIn(["strategic", "financial", "mentor", "networker"])
    .withMessage("Invalid investor role"),
  body("fundingGoal").notEmpty().withMessage("Funding goal is required"),
  body("fundingGoal.amount")
    .notEmpty()
    .withMessage("Funding goal amount is required")
    .isInt({ min: 0 })
    .withMessage("Funding goal amount must be a non-negative number"),
  body("fundingGoal.currency")
    .notEmpty()
    .withMessage("Funding goal currency is required")
    .isIn(["USD", "EUR", "GBP"])
    .withMessage("Invalid currency"),
  body("amountRaised")
    .notEmpty()
    .withMessage("Amount raised is required")
    .isInt({ min: 0 })
    .withMessage("Amount raised must be a non-negative number"),
  body("minInvestmentPerInvestor")
    .notEmpty()
    .withMessage("Minimum investment per investor is required")
    .isInt({ min: 0 })
    .withMessage(
      "Minimum investment per investor must be a non-negative number"
    ),
  body("previousFunding")
    .notEmpty()
    .withMessage("Previous funding is required")
    .isInt({ min: 0 })
    .withMessage("Previous funding must be a non-negative number"),
  body("team")
    .isArray({ min: 1 })
    .withMessage("At least one team member is required"),
  body("team.*.name").notEmpty().withMessage("Team member name is required"),
  body("team.*.role").notEmpty().withMessage("Team member role is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!req.files || !req.files.profilePicture) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Profile picture is required" }] });
    }
    if (!req.files || !req.files.coverPicture) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Cover picture is required" }] });
    }
    if (!req.files || !req.files.pitchDeck) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Pitch deck is required" }] });
    }
    next();
  },
];

module.exports = {
  validateRegister,
  validateRegisterCV,
  validateLogin,
  validateRequestPasswordReset,
  validateVerifyCode,
  validateResetPassword,
  validateChangePassword,
  validateJobseekerDetails,
  validateInvestorDetails,
  validateStartupDetails,
};
