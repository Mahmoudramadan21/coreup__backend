const express = require("express");
const { auth, restrictTo } = require("../middleware/auth");
const {
  getMatchingInvestors,
  searchInvestors,
} = require("../controllers/startupController");

const router = express.Router();

/**
 * @swagger
 * /startups/matching-investors:
 *   get:
 *     summary: Get investors matching startup's profile
 *     description: Retrieves investors whose investment criteria (industries, stage, investment range, and locations) match the authenticated startup's profile, using relaxed matching.
 *     tags: [Startups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Matching investors retrieved successfully
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
 *                         description: Investor ID
 *                       profilePic:
 *                         type: string
 *                         nullable: true
 *                         description: Investor profile picture URL
 *                       coverPic:
 *                         type: string
 *                         nullable: true
 *                         description: Investor cover picture URL
 *                       name:
 *                         type: string
 *                         description: Investor's full name
 *                       bio:
 *                         type: string
 *                         description: Investor's professional bio
 *                       investorType:
 *                         type: string
 *                         description: Type of investor (e.g., Angel Investor)
 *                       location:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                         description: Investor location
 *                       keyPoints:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             label:
 *                               type: string
 *                             value:
 *                               type: string
 *                           description: Key investor metrics
 *                       investmentCriteria:
 *                         type: object
 *                         properties:
 *                           industries:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Preferred industries
 *                           locations:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 country:
 *                                   type: string
 *                                 city:
 *                                   type: string
 *                             description: Preferred locations
 *                           investmentRange:
 *                             type: object
 *                             properties:
 *                               min:
 *                                 type: number
 *                               max:
 *                                 type: number
 *                             description: Investment range
 *                           stage:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Preferred startup stages
 *                 message:
 *                   type: string
 *       400:
 *         description: Startup profile not set
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
 *         description: Access restricted to startup
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
 *         description: Startup not found
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
router.get(
  "/matching-investors",
  auth,
  restrictTo(["startup"]),
  getMatchingInvestors
);

/**
 * @swagger
 * /startups/search-investors:
 *   get:
 *     summary: Search for investors based on criteria
 *     description: Allows authenticated startups to search for investors based on industry, investor type, location, investment range, and stage. All parameters are optional.
 *     tags: [Startups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Industry to filter investors (e.g., Technology, Finance)
 *       - in: query
 *         name: investorType
 *         schema:
 *           type: string
 *           enum: [angel, vc, privateEquity]
 *         description: Type of investor to filter
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country to filter investors
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City to filter investors
 *       - in: query
 *         name: minInvestment
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum investment amount
 *       - in: query
 *         name: maxInvestment
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum investment amount
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [seed, early-stage, growth, late-stage]
 *         description: Preferred investment stage
 *     responses:
 *       200:
 *         description: Investors retrieved successfully
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
 *                         description: Investor ID
 *                       profilePic:
 *                         type: string
 *                         nullable: true
 *                         description: Investor profile picture URL
 *                       coverPic:
 *                         type: string
 *                         nullable: true
 *                         description: Investor cover picture URL
 *                       name:
 *                         type: string
 *                         description: Investor's full name
 *                       bio:
 *                         type: string
 *                         description: Investor's professional bio
 *                       investorType:
 *                         type: string
 *                         description: Type of investor (e.g., Angel Investor)
 *                       location:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                         description: Investor location
 *                       keyPoints:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             label:
 *                               type: string
 *                             value:
 *                               type: string
 *                           description: Key investor metrics
 *                       investmentCriteria:
 *                         type: object
 *                         properties:
 *                           industries:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Preferred industries
 *                           locations:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 country:
 *                                   type: string
 *                                 city:
 *                                   type: string
 *                             description: Preferred locations
 *                           investmentRange:
 *                             type: object
 *                             properties:
 *                               min:
 *                                 type: number
 *                               max:
 *                                 type: number
 *                             description: Investment range
 *                           stage:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Preferred startup stages
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
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
 *         description: Access restricted to startup
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
 *         description: Startup not found
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
router.get("/search-investors", auth, restrictTo(["startup"]), searchInvestors);

module.exports = router;
