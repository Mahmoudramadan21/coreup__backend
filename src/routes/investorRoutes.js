const express = require("express");
const { auth, restrictTo } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
  updateInvestorContactInfo,
  updateInvestmentCriteria,
  updateInvestorProfile,
  searchStartups,
  getMatchingStartups,
  getStartupDetails,
} = require("../controllers/investorController");

const router = express.Router();

/**
 * @swagger
 * /investor/contact-info:
 *   patch:
 *     summary: Update investor contact information
 *     description: Updates contact information for authenticated investors
 *     tags: [Investors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Investor's first name
 *               lastName:
 *                 type: string
 *                 description: Investor's last name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Investor's email address
 *               phone:
 *                 type: string
 *                 description: Investor's phone number
 *               country:
 *                 type: string
 *                 description: Investor's country
 *               city:
 *                 type: string
 *                 description: Investor's city
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *                 description: Profile picture file
 *               coverPicture:
 *                 type: string
 *                 format: binary
 *                 description: Cover picture file
 *     responses:
 *       200:
 *         description: Contact information updated successfully
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
 *         description: Validation failed or Email already in use
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
 *         description: Authentication failed
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
 *       403:
 *         description: Access restricted to investor
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
router.patch(
  "/contact-info",
  auth,
  restrictTo(["investor"]),
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "coverPicture", maxCount: 1 },
  ]),
  updateInvestorContactInfo
);

/**
 * @swagger
 * /investor/investment-criteria:
 *   patch:
 *     summary: Update investor investment criteria
 *     description: Updates investment criteria for authenticated investors
 *     tags: [Investors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               industries:
 *                 type: array
 *                 minItems: 3
 *                 maxItems: 3
 *                 items:
 *                   type: string
 *                   enum:
 *                     - Agriculture
 *                     - Business Services
 *                     - Education & Training
 *                     - Energy & Natural Resources
 *                     - Entertainment & Leisure
 *                     - Fashion & Beauty
 *                     - Finance
 *                     - Food & Beverage
 *                     - Hospitality, Restaurants & Bars
 *                     - Manufacturing & Engineering
 *                     - Media
 *                     - Medical & Sciences
 *                     - Personal Services
 *                     - Products & Inventions
 *                     - Property
 *                     - Retail
 *                     - Sales & Marketing
 *                     - Software
 *                     - Technology
 *                     - Transportation
 *                 description: Exactly 3 industries of interest
 *               locations:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [country, city]
 *                   properties:
 *                     country:
 *                       type: string
 *                       description: Country of interest
 *                     city:
 *                       type: string
 *                       description: City of interest
 *               investmentRange:
 *                 type: object
 *                 required: [min, max]
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                     description: Minimum investment amount
 *                   max:
 *                     type: number
 *                     minimum: 0
 *                     description: Maximum investment amount
 *               stage:
 *                 type: string
 *                 enum: [seed, early-stage, growth, late-stage]
 *                 description: Preferred investment stage
 *     responses:
 *       200:
 *         description: Investment criteria updated successfully
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
 *         description: Authentication failed
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
 *       403:
 *         description: Access restricted to investor
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
router.patch(
  "/investment-criteria",
  auth,
  restrictTo(["investor"]),
  updateInvestmentCriteria
);

/**
 * @swagger
 * /investor/profile:
 *   patch:
 *     summary: Update investor profile
 *     description: Updates the profile details for authenticated investors (bio, LinkedIn, Twitter, Facebook, website, areas of expertise, number of previous investments, companies)
 *     tags: [Investors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               investorType:
 *                 type: string
 *                 enum: [angel, vc, privateEquity]
 *                 description: Type of investor (required if provided)
 *               twitter:
 *                 type: string
 *                 format: uri
 *                 description: Investor's Twitter profile URL
 *               facebook:
 *                 type: string
 *                 format: uri
 *                 description: Investor's Facebook profile URL
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Investor's website URL
 *               bio:
 *                 type: string
 *                 description: Investor's professional bio
 *               areasOfExpertise:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Investor's areas of expertise (required if provided)
 *               numberOfPreviousInvestments:
 *                 type: number
 *                 minimum: 0
 *                 description: Total number of previous investments
 *               companies:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Name of the invested company
 *                     amount:
 *                       type: number
 *                       minimum: 0
 *                       description: Investment amount
 *                     date:
 *                       type: string
 *                       format: date
 *                       description: Investment date
 *               linkedIn:
 *                 type: string
 *                 format: uri
 *                 description: Investor's LinkedIn profile URL
 *               portfolio:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     company:
 *                       type: string
 *                       description: Name of the invested company
 *                     amount:
 *                       type: number
 *                       minimum: 0
 *                       description: Investment amount
 *                     date:
 *                       type: string
 *                       format: date
 *                       description: Investment date
 *     responses:
 *       200:
 *         description: Investor profile updated successfully
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
 *         description: Authentication failed
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
 *       403:
 *         description: Access restricted to investor
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
router.patch("/profile", auth, restrictTo(["investor"]), updateInvestorProfile);

/**
 * @swagger
 * /investor/matching-startups:
 *   get:
 *     summary: Get startups matching investor's criteria
 *     description: Retrieves startups that match the authenticated investor's investment criteria (industries, stage, investment range, and locations).
 *     tags: [Investors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Matching startups retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Startup ID
 *                       profilePic:
 *                         type: string
 *                         description: Startup profile picture URL
 *                       coverPic:
 *                         type: string
 *                         description: Startup cover picture URL
 *                       executive:
 *                         type: string
 *                         description: Name of the first team member
 *                       title:
 *                         type: string
 *                         description: Startup pitch title
 *                       location:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                         description: Startup location
 *                       description:
 *                         type: string
 *                         description: Startup description
 *                       keyPoints:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             label:
 *                               type: string
 *                             value:
 *                               type: string
 *                         description: Key startup metrics
 *                       totalRequired:
 *                         type: number
 *                         description: Total funding goal
 *                       minPerInvestor:
 *                         type: number
 *                         description: Minimum investment per investor
 *                 message:
 *                   type: string
 *       400:
 *         description: Investment criteria not set
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Access restricted to investor
 *       404:
 *         description: Investor not found
 *       500:
 *         description: Server error
 */
router.get(
  "/matching-startups",
  auth,
  restrictTo(["investor"]),
  getMatchingStartups
);

/**
 * @swagger
 * /investor/search-startups:
 *   get:
 *     summary: Search for startups based on criteria
 *     description: Allows authenticated investors to search for startups based on industries, stage, location, funding goal, and success prediction score.
 *     tags: [Investors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Industry to filter startups (e.g., Technology, Finance)
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [idea, prototype, mvp, scaling]
 *         description: Startup stage to filter
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country to filter startups
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City to filter startups
 *       - in: query
 *         name: minFunding
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum funding goal
 *       - in: query
 *         name: maxFunding
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum funding goal
 *       - in: query
 *         name: minSuccessScore
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum success prediction score
 *     responses:
 *       200:
 *         description: Startups retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Startup ID
 *                       name:
 *                         type: string
 *                         description: Startup name (firstName + lastName)
 *                       industries:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Primary and secondary industries
 *                       stage:
 *                         type: string
 *                         description: Startup stage
 *                       location:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                         description: Startup location
 *                       fundingGoal:
 *                         type: object
 *                         properties:
 *                           amount:
 *                             type: number
 *                           currency:
 *                             type: string
 *                         description: Funding goal
 *                       successPrediction:
 *                         type: object
 *                         properties:
 *                           score:
 *                             type: number
 *                           details:
 *                             type: string
 *                         description: Success prediction details
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Access restricted to investor
 *       500:
 *         description: Server error
 */
router.get("/search-startups", auth, restrictTo(["investor"]), searchStartups);

/**
 * @swagger
 * /investor/startup/{id}:
 *   get:
 *     summary: Get detailed information about a specific startup
 *     description: Retrieve all relevant data for a startup by its ID, accessible only to authenticated investors.
 *     tags: [Investors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: The ID of the startup to retrieve
 *     responses:
 *       200:
 *         description: Successful response with startup details
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
 *                     id:
 *                       type: string
 *                       description: Startup ID
 *                     profilePic:
 *                       type: string
 *                       nullable: true
 *                       description: Startup profile picture URL
 *                     coverPic:
 *                       type: string
 *                       nullable: true
 *                       description: Startup cover picture URL
 *                     executive:
 *                       type: string
 *                       description: Name of the first team member
 *                     title:
 *                       type: string
 *                       description: Startup pitch title
 *                     location:
 *                       type: object
 *                       properties:
 *                         country:
 *                           type: string
 *                         city:
 *                           type: string
 *                       description: Startup location
 *                     description:
 *                       type: string
 *                       description: Startup description
 *                     keyPoints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           label:
 *                             type: string
 *                           value:
 *                             type: string
 *                       description: Key startup metrics
 *                     totalRequired:
 *                       type: number
 *                       description: Total funding goal
 *                     minPerInvestor:
 *                       type: number
 *                       description: Minimum investment per investor
 *                     industries:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Primary and secondary industries
 *                     successPrediction:
 *                       type: object
 *                       properties:
 *                         score:
 *                           type: number
 *                           nullable: true
 *                         details:
 *                           type: string
 *                           nullable: true
 *                       description: Success prediction details
 *                     website:
 *                       type: string
 *                       nullable: true
 *                       description: Startup website URL
 *                     mobileNumber:
 *                       type: string
 *                       nullable: true
 *                       description: Startup contact number
 *                     team:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           role:
 *                             type: string
 *                       description: Startup team members
 *                     pitchDeck:
 *                       type: string
 *                       nullable: true
 *                       description: URL to the pitch deck
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid startup ID
 *       401:
 *         description: Authentication failed
 *       403:
 *         description: Access restricted to investor
 *       404:
 *         description: Startup not found
 *       500:
 *         description: Server error
 */
router.get("/startup/:id", auth, getStartupDetails);

module.exports = router;

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
 */
