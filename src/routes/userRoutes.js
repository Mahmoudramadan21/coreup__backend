const express = require("express");
const { auth, restrictTo } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { upload } = require("../middleware/upload");
const {
  updateProfile,
  getProfile,
  predictSuccess,
  getInvestorById,
  deleteAccount,
} = require("../controllers/userController");

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: User ID
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         email:
 *           type: string
 *           description: User's email address
 *         userType:
 *           type: string
 *           enum: [jobseeker, investor, startup, admin]
 *           description: Type of user
 *         phone:
 *           type: string
 *           description: User's phone number
 *         birthdate:
 *           type: object
 *           description: User's birthdate
 *         gender:
 *           type: string
 *           description: User's gender
 *         nationality:
 *           type: string
 *           description: User's nationality
 *         location:
 *           type: object
 *           description: User's location
 *         profile:
 *           type: object
 *           description: Type-specific profile data
 *         profilePicture:
 *           type: string
 *           description: URL to user's profile picture
 *           nullable: true
 *         coverPicture:
 *           type: string
 *           description: URL to user's cover picture
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: User last updated date
 *     UpdateProfile:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         birthdate:
 *           type: object
 *         gender:
 *           type: string
 *         nationality:
 *           type: string
 *         location:
 *           type: object
 *         profile:
 *           type: object
 *           properties:
 *             jobseeker:
 *               type: object
 *               properties:
 *                 yearsOfExperience:
 *                   type: number
 *                 skills:
 *                   type: array
 *                   items:
 *                     type: string
 *                 experiences:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Experience'
 *             investor:
 *               type: object
 *               properties:
 *                 bio:
 *                   type: string
 *                 portfolio:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       company:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       date:
 *                         type: string
 *                         format: date
 *                 linkedIn:
 *                   type: string
 *                 website:
 *                   type: string
 *                 investmentCriteria:
 *                   type: object
 *                   properties:
 *                     industries:
 *                       type: array
 *                       items:
 *                         type: string
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                     investmentRange:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                     stage:
 *                       type: array
 *                       items:
 *                         type: string
 *             startup:
 *               type: object
 *               properties:
 *                 pitchTitle:
 *                   type: string
 *                 website:
 *                   type: string
 *                 mobileNumber:
 *                   type: string
 *                 industry1:
 *                   type: string
 *                 industry2:
 *                   type: string
 *                 location:
 *                   type: object
 *                 description:
 *                   type: string
 *                 fundingGoal:
 *                   type: object
 *                 amountRaised:
 *                   type: number
 *                 minInvestmentPerInvestor:
 *                   type: number
 *                 stage:
 *                   type: string
 *                 idealInvestorRole:
 *                   type: string
 *                 previousFunding:
 *                   type: number
 *                 team:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                 pitchDeck:
 *                   type: string
 *                 successPrediction:
 *                   type: object
 *     Experience:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Job title
 *         company:
 *           type: string
 *           description: Company name
 *         location:
 *           type: object
 *           description: Job location
 *         startDate:
 *           type: string
 *           format: date
 *           description: Start date of experience
 *         endDate:
 *           type: string
 *           format: date
 *           description: End date of experience
 *         description:
 *           type: string
 *           description: Job description
 *     Investor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Investor ID
 *         firstName:
 *           type: string
 *           description: Investor's first name
 *         lastName:
 *           type: string
 *           description: Investor's last name
 *         email:
 *           type: string
 *           description: Investor's email address
 *         userType:
 *           type: string
 *           enum: [investor]
 *           description: Type of user (always 'investor')
 *         phone:
 *           type: string
 *           description: Investor's phone number
 *           nullable: true
 *         nationality:
 *           type: string
 *           description: Investor's nationality
 *           nullable: true
 *         location:
 *           type: object
 *           description: Investor's location
 *           nullable: true
 *         profilePicture:
 *           type: string
 *           description: URL to investor's profile picture
 *           nullable: true
 *         coverPicture:
 *           type: string
 *           description: URL to investor's cover picture
 *           nullable: true
 *         profile:
 *           type: object
 *           properties:
 *             investor:
 *               type: object
 *               properties:
 *                 bio:
 *                   type: string
 *                   description: Investor's bio
 *                 investmentCriteria:
 *                   type: object
 *                   properties:
 *                     industries:
 *                       type: array
 *                       items:
 *                         type: string
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                     investmentRange:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                     stage:
 *                       type: array
 *                       items:
 *                         type: string
 *                 portfolio:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       company:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       date:
 *                         type: string
 *                         format: date
 *                 linkedIn:
 *                   type: string
 *                   description: Investor's LinkedIn profile URL
 *                 website:
 *                   type: string
 *                   description: Investor's website URL
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Investor creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Investor last updated date
 *
 */

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieves the profile data for the authenticated user based on their type
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
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
 *                     profilePicture:
 *                       type: string
 *                       nullable: true
 *                     name:
 *                       type: string
 *                     country:
 *                       type: string
 *                     flag:
 *                       type: string
 *                     joined_date:
 *                       type: string
 *                     role:
 *                       type: string
 *                     location:
 *                       type: string
 *                     investment_range:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                     about:
 *                       type: string
 *                     areas_of_expertise:
 *                       type: array
 *                       items:
 *                         type: string
 *                     companies:
 *                       type: array
 *                       items:
 *                         type: object
 *                     industries:
 *                       type: array
 *                       items:
 *                         type: string
 *                     stages:
 *                       type: array
 *                       items:
 *                         type: string
 *                     keywords:
 *                       type: array
 *                       items:
 *                         type: string
 *                     locations:
 *                       type: array
 *                       items:
 *                         type: string
 *                     countries:
 *                       type: array
 *                       items:
 *                         type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: Authentication required
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
router.get("/profile", auth, getProfile);

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Updates the profile data for the authenticated user based on their type
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfile'
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               birthdate:
 *                 type: object
 *               gender:
 *                 type: string
 *               nationality:
 *                 type: string
 *               location:
 *                 type: object
 *               profile:
 *                 type: object
 *               pitchDeck:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation failed
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
 *       401:
 *         description: Authentication required
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
router.patch("/profile", auth, upload.single("pitchDeck"), updateProfile);

/**
 * @swagger
 * /users/predict-success:
 *   post:
 *     summary: Predict startup success
 *     description: Generates a success prediction for a startup (placeholder)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success prediction generated
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
 *                     score:
 *                       type: number
 *                       description: Prediction score (0-100)
 *                     details:
 *                       type: string
 *                       description: Prediction details
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
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
 *       404:
 *         description: Startup profile not found
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
router.post("/predict-success", auth, restrictTo(["startup"]), predictSuccess);

/**
 * @swagger
 * /users/investor/{id}:
 *   get:
 *     summary: Get investor by ID
 *     description: Retrieves the investor's profile data by their ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the investor
 *     responses:
 *       200:
 *         description: Investor data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Investor'
 *                 message:
 *                   type: string
 *                   example: "Investor data retrieved successfully"
 *       400:
 *         description: Invalid user ID
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
 *                   example: "Invalid user ID"
 *       403:
 *         description: User is not an investor
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
 *                   example: "User is not an investor"
 *       404:
 *         description: User or investor profile not found
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
 *       401:
 *         description: Authentication required
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
 *                   example: "Authentication required: No token provided"
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
router.get("/investor/:id", auth, getInvestorById);

/**
 * @swagger
 * /users/profile:
 *   delete:
 *     summary: Delete user account
 *     description: Deletes the authenticated user's account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted successfully
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
 *                   example: "Account deleted successfully"
 *       400:
 *         description: Invalid user ID
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
 *                   example: "Invalid user ID"
 *       401:
 *         description: Authentication required
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
 *                   example: "Authentication required: No token provided"
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
router.delete("/profile", auth, deleteAccount);

module.exports = router;
