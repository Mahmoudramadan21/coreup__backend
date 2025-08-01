const express = require("express");
const { auth, restrictTo } = require("../middleware/auth");
const { authRateLimiter } = require("../middleware/rateLimit");
const {
  register,
  registerJobseekerDetails,
  registerInvestorDetails,
  editStartupDetails,
  registerWithCV,
  login,
  getUserType,
  requestPasswordReset,
  verifyCode,
  resetPassword,
  changePassword,
  getStartupDetails,
  validateToken,
  refreshToken,
  logout,
} = require("../controllers/authController");
const { upload } = require("../middleware/upload");
const {
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
} = require("../validators/authValidator");

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     RegisterSchema:
 *       type: object
 *       required: [firstName, lastName, email, password, userType]
 *       properties:
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           minLength: 6
 *           description: User's password
 *         userType:
 *           type: string
 *           enum: [jobseeker, investor, startup, admin]
 *           description: Type of user
 *     JobseekerDetailsSchema:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           maxLength: 50
 *           description: First name of the jobseeker
 *         lastName:
 *           type: string
 *           maxLength: 50
 *           description: Last name of the jobseeker
 *         gender:
 *           type: string
 *           enum: [male, female, other, preferNotToSay]
 *           description: Gender of the jobseeker
 *         birthdate:
 *           type: object
 *           properties:
 *             day:
 *               type: integer
 *               minimum: 1
 *               maximum: 31
 *             month:
 *               type: string
 *               enum: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
 *             year:
 *               type: integer
 *               minimum: 1900
 *               maximum: 2025
 *           description: Birthdate of the jobseeker
 *         nationality:
 *           type: string
 *           maxLength: 50
 *           description: Nationality of the jobseeker
 *         location:
 *           type: object
 *           properties:
 *             country:
 *               type: string
 *               maxLength: 50
 *             city:
 *               type: string
 *               maxLength: 50
 *             area:
 *               type: string
 *               maxLength: 50
 *           description: Location of the jobseeker
 *         phone:
 *           type: string
 *           pattern: ^\+?[1-9]\d{1,14}$
 *           description: Phone number of the jobseeker
 *         profile:
 *           type: object
 *           properties:
 *             jobseeker:
 *               type: object
 *               properties:
 *                 yearsOfExperience:
 *                   type: integer
 *                   minimum: 0
 *                 education:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       degree:
 *                         type: string
 *                         maxLength: 100
 *                       major:
 *                         type: string
 *                         maxLength: 100
 *                       university:
 *                         type: string
 *                         maxLength: 100
 *                       startDate:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             enum: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
 *                           year:
 *                             type: integer
 *                             minimum: 1900
 *                             maximum: 2025
 *                       endDate:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             enum: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
 *                           year:
 *                             type: integer
 *                             minimum: 1900
 *                             maximum: 2030
 *                       isCurrent:
 *                         type: boolean
 *                 experiences:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       company:
 *                         type: string
 *                       jobCategory:
 *                         type: string
 *                       experienceType:
 *                         type: string
 *                         enum: [Full Time, Part Time, Freelance, Internship, Volunteering, Student Activities]
 *                       location:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                       startDate:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             enum: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
 *                           year:
 *                             type: integer
 *                             minimum: 1900
 *                             maximum: 2025
 *                       endDate:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                             enum: [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
 *                           year:
 *                             type: integer
 *                             minimum: 1900
 *                             maximum: 2025
 *                       isCurrent:
 *                         type: boolean
 *                       description:
 *                         type: string
 *                         maxLength: 500
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: string
 *         profilePicture:
 *           type: string
 *           format: binary
 *           description: Profile picture file (JPEG, JPG, PNG)
 *         coverPicture:
 *           type: string
 *           format: binary
 *           description: Cover picture file (JPEG, JPG, PNG)
 *     InvestorDetailsSchema:
 *       type: object
 *       required: [bio, investmentCriteria, profilePicture, coverPicture]
 *       properties:
 *         bio:
 *           type: string
 *           maxLength: 1000
 *         investmentCriteria:
 *           type: object
 *           required: [industries, locations, investmentRange, stage]
 *           properties:
 *             industries:
 *               type: array
 *               minItems: 3
 *               maxItems: 3
 *               items:
 *                 type: string
 *                 enum:
 *                   - Agriculture
 *                   - Business Services
 *                   - Education & Training
 *                   - Energy & Natural Resources
 *                   - Entertainment & Leisure
 *                   - Fashion & Beauty
 *                   - Finance
 *                   - Food & Beverage
 *                   - Hospitality, Restaurants & Bars
 *                   - Manufacturing & Engineering
 *                   - Media
 *                   - Medical & Sciences
 *                   - Personal Services
 *                   - Products & Inventions
 *                   - Property
 *                   - Retail
 *                   - Sales & Marketing
 *                   - Software
 *                   - Technology
 *                   - Transportation
 *             locations:
 *               type: array
 *               minItems: 1
 *               items:
 *                 type: object
 *                 required: [country, city]
 *                 properties:
 *                   country:
 *                     type: string
 *                   city:
 *                     type: string
 *             investmentRange:
 *               type: object
 *               required: [min, max]
 *               properties:
 *                 min:
 *                   type: number
 *                   minimum: 0
 *                 max:
 *                   type: number
 *                   minimum: 0
 *             stage:
 *               type: array
 *               minItems: 1
 *               items:
 *                 type: string
 *                 enum: ["Achieving Sales", "Breaking Even", "MVP/Finished Product", "Pre-Startup/R&D", "Profitable"]
 *         profilePicture:
 *           type: string
 *           format: binary
 *         coverPicture:
 *           type: string
 *           format: binary
 *     StartupDetailsSchema:
 *       type: object
 *       properties:
 *         pitchTitle:
 *           type: string
 *           maxLength: 100
 *         website:
 *           type: string
 *           pattern: ^https?:\/\/.+$
 *           nullable: true
 *         mobileNumber:
 *           type: string
 *           pattern: ^\+?[1-9]\d{1,14}$
 *         industry1:
 *           type: string
 *         industry2:
 *           type: string
 *         stage:
 *           type: string
 *           enum: [idea, prototype, mvp, scaling]
 *         idealInvestorRole:
 *           type: string
 *           enum: [strategic, financial, mentor, networker]
 *         fundingGoal:
 *           type: object
 *           required: [amount, currency]
 *           properties:
 *             amount:
 *               type: number
 *               minimum: 0
 *             currency:
 *               type: string
 *               enum: [USD, EUR, GBP]
 *         amountRaised:
 *           type: number
 *           minimum: 0
 *         minInvestmentPerInvestor:
 *           type: number
 *           minimum: 0
 *         previousFunding:
 *           type: number
 *           minimum: 0
 *         team:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required: [name, role]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *                 description: Name of the team member
 *               role:
 *                 type: string
 *                 maxLength: 100
 *                 description: Role of the team member
 *         description:
 *           type: string
 *           maxLength: 1000
 *         pitchDeck:
 *           type: string
 *           format: binary
 *         profilePicture:
 *           type: string
 *           format: binary
 *         coverPicture:
 *           type: string
 *           format: binary
 *         location:
 *           type: object
 *           properties:
 *             country:
 *               type: string
 *               maxLength: 50
 *             city:
 *               type: string
 *               maxLength: 50
 *     RegisterCVSchema:
 *       type: object
 *       required: [email, firstName, lastName]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Jobseeker's email address
 *         firstName:
 *           type: string
 *           description: Jobseeker's first name
 *         lastName:
 *           type: string
 *           description: Jobseeker's last name
 *     LoginSchema:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's password
 *     ResetPasswordSchema:
 *       type: object
 *       required: [resetToken, newPassword]
 *       properties:
 *         resetToken:
 *           type: string
 *           description: JWT reset token obtained after verifying the code
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           description: New password for the user
 *     ChangePasswordSchema:
 *       type: object
 *       required: [oldPassword, newPassword]
 *       properties:
 *         oldPassword:
 *           type: string
 *           description: Current password of the user
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           description: New password for the user
 *     RequestPasswordResetSchema:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *     VerifyCodeSchema:
 *       type: object
 *       required: [email, verificationCode]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         verificationCode:
 *           type: string
 *           pattern: ^\d{4}$
 *           description: 4-digit verification code sent to the user's email
 *     ValidateTokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 userType:
 *                   type: string
 *                   enum: [jobseeker, investor, startup, admin]
 *                 firstName:
 *                   type: string
 *                 lastName:
 *                   type: string
 *                 profile:
 *                   type: object
 *                 profilePicture:
 *                   type: string
 *                 coverPicture:
 *                   type: string
 *         message:
 *           type: string
 *           example: "Token is valid"
 *   responses:
 *     UnauthorizedError:
 *       description: Unauthorized access
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               data:
 *                 type: null
 *               message:
 *                 type: string
 *                 example: "Authentication required: No token provided"
 *     ForbiddenError:
 *       description: Access restricted
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               data:
 *                 type: null
 *               message:
 *                 type: string
 *                 example: "Access restricted to admin"
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user with basic information
 *     description: Creates a new user account with basic information (firstName, lastName, email, password, userType).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterSchema'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         userType:
 *                           type: string
 *                     token:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: User already exists or validation failed
 *       500:
 *         description: Server error
 */
router.post("/register", validateRegister, register);

/**
 * @swagger
 * /auth/register-jobseeker-details:
 *   patch:
 *     summary: Update jobseeker details
 *     description: Partially updates jobseeker profile with provided details and optional profile/cover pictures
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/JobseekerDetailsSchema'
 *     responses:
 *       200:
 *         description: Jobseeker details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed or no fields provided
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/register-jobseeker-details",
  auth,
  restrictTo("jobseeker"),
  upload.fields([{ name: "profilePicture" }, { name: "coverPicture" }]),
  // validateJobseekerDetails,
  registerJobseekerDetails
);

/**
 * @swagger
 * /auth/register-investor-details:
 *   post:
 *     summary: Register investor details
 *     description: Updates investor profile with required details and profile/cover pictures
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/InvestorDetailsSchema'
 *     responses:
 *       200:
 *         description: Investor details registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed or missing required files
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post(
  "/register-investor-details",
  auth,
  restrictTo("investor"),
  upload.fields([{ name: "profilePicture" }, { name: "coverPicture" }]),
  registerInvestorDetails
);

/**
 * @swagger
 * /auth/edit-startup-details:
 *   patch:
 *     summary: Update startup details
 *     description: Updates startup profile with optional details, profile/cover pictures, and pitch deck
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/StartupDetailsSchema'
 *     responses:
 *       200:
 *         description: Startup details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/edit-startup-details",
  auth,
  restrictTo("startup"),
  upload.fields([
    { name: "profilePicture" },
    { name: "coverPicture" },
    { name: "pitchDeck" },
  ]),
  editStartupDetails
);

/**
 * @swagger
 * /auth/register-cv:
 *   post:
 *     summary: Register a jobseeker with CV
 *     description: Creates a jobseeker account with a CV upload
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/RegisterCVSchema'
 *     responses:
 *       201:
 *         description: User registered with CV
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         userType:
 *                           type: string
 *                     token:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: User already exists or CV required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.post(
  "/register-cv",
  upload.single("cv"),
  validateRegisterCV,
  registerWithCV
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     description: Authenticates a user and returns a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginSchema'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         userType:
 *                           type: string
 *                     token:
 *                       type: string
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.post("/login", authRateLimiter, validateLogin, login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout a user
 *     description: Clears authentication cookies and removes refresh token from the database
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/logout", auth, logout);

/**
 * @swagger
 * /auth/user-type:
 *   get:
 *     summary: Get user type
 *     description: Retrieves the authenticated user's type (jobseeker, investor, startup, admin)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User type retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userType:
 *                       type: string
 *                       enum: [jobseeker, investor, startup, admin]
 *                 message:
 *                   type: string
 *                   example: "User type retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/user-type", auth, getUserType);

/**
 * @swagger
 * /auth/request-password-reset:
 *   post:
 *     summary: Request a password reset verification code
 *     description: Sends a 4-digit verification code to the provided email if it exists.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestPasswordResetSchema'
 *     responses:
 *       200:
 *         description: If the email exists, a verification code has been sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "If the email exists, a verification code has been sent"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.post(
  "/request-password-reset",
  authRateLimiter,
  validateRequestPasswordReset,
  requestPasswordReset
);

/**
 * @swagger
 * /auth/verify-code:
 *   post:
 *     summary: Verify the password reset verification code
 *     description: Verifies the 4-digit code sent to the user's email and returns a JWT reset token if valid.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyCodeSchema'
 *     responses:
 *       200:
 *         description: Verification successful, JWT reset token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       description: JWT token to be used for resetting the password
 *                 message:
 *                   type: string
 *                   example: "Verification successful, use the token to reset your password"
 *       400:
 *         description: Invalid or expired verification code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired verification code"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/verify-code", validateVerifyCode, verifyCode);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using JWT reset token
 *     description: Resets the user's password using a valid JWT reset token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordSchema'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully"
 *       400:
 *         description: Invalid or expired reset token, or invalid password
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired reset token"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/reset-password", resetPassword);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     description: Changes the authenticated user's password after verifying the old password.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordSchema'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Password changed successfully"
 *       400:
 *         description: Invalid input or user uses CV-based authentication
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Old password and new password (min 6 characters) are required"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/change-password", auth, changePassword);

/**
 * @swagger
 * /auth/startup-details:
 *   get:
 *     summary: Get startup details
 *     description: Retrieves the authenticated startup user's details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Startup details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/startup-details", auth, restrictTo("startup"), getStartupDetails);

/**
 * @swagger
 * /auth/validate-token:
 *   get:
 *     summary: Validate a JWT token
 *     description: Validates the provided JWT token and returns user data if valid
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidateTokenResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get("/validate-token", auth, validateToken);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh authentication token
 *     description: Generates a new auth token using a valid refresh token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         userType:
 *                           type: string
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Invalid or expired refresh token"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.post("/refresh-token", refreshToken);

module.exports = router;
