const express = require("express");
const router = express.Router();
const { auth, restrictTo } = require("../middleware/auth");
const {
  sendNudge,
  updateNudge,
  getNudgesSentToStartup,
  buyNudges,
  getInvestorNudgeAndConnectionHistory,
} = require("../controllers/nudgesController");

/**
 * @swagger
 * tags:
 *   - name: Nudges
 *     description: Endpoints for managing nudge-related operations between startups and investors
 */

/**
 * @swagger
 * /nudges/buy:
 *   post:
 *     summary: Buy nudge packages
 *     description: Allows a startup to purchase nudge packages to increase their nudge limit. The cost is based on predefined quantities (10, 25, or 50 nudges).
 *     tags: [Nudges]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *                 enum: [10, 25, 50]
 *                 description: Number of nudges to purchase. Costs are 50 VCR for 10, 100 VCR for 25, and 180 VCR for 50.
 *             required:
 *               - quantity
 *     responses:
 *       200:
 *         description: Nudges purchased successfully
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
 *                     nudgeLimit:
 *                       type: integer
 *                       description: Updated nudge limit for the startup
 *                 message:
 *                   type: string
 *                   example: "Nudges purchased successfully"
 *       400:
 *         description: Invalid quantity provided
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
 *                   example: "Invalid nudge quantity"
 *       403:
 *         description: Access restricted to startups only
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
 *                   example: "Only startups can buy nudges"
 *       500:
 *         description: Internal server error
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
router.post("/buy", auth, restrictTo(["startup"]), buyNudges);

/**
 * @swagger
 * /nudges/{id}:
 *   post:
 *     summary: Send a nudge to an investor
 *     description: Allows an authenticated startup to send a nudge to a specific investor, establishing a connection if none exists.
 *     tags: [Nudges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: The ID of the investor to nudge
 *     responses:
 *       201:
 *         description: Nudge and connection sent successfully
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
 *                     _id:
 *                       type: string
 *                       description: Nudge ID
 *                     sender:
 *                       type: string
 *                       description: Sender's user ID
 *                     receiver:
 *                       type: string
 *                       description: Receiver's user ID
 *                     status:
 *                       type: string
 *                       description: Initial status of the nudge (pending)
 *                     amount:
 *                       type: number
 *                       description: Nudge amount (default 0)
 *                     currency:
 *                       type: string
 *                       description: Currency of the nudge (default VCR)
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       description: Expiration date (7 days from creation)
 *                 message:
 *                   type: string
 *                   example: "Nudge and connection sent successfully"
 *       400:
 *         description: Invalid request, existing nudge, nudge limit reached, or rejected connection
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
 *                   example: "Nudge limit reached"
 *       403:
 *         description: Access restricted to startups only
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
 *                   example: "Only startups can send nudges"
 *       404:
 *         description: Investor not found
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
 *                   example: "Receiver must be an investor"
 *       500:
 *         description: Internal server error
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
router.post("/:id", auth, restrictTo(["startup"]), sendNudge);

/**
 * @swagger
 * /nudges/{id}:
 *   patch:
 *     summary: Update the status of a nudge
 *     description: Allows an investor to accept, reject, or mark as expired a pending nudge. Updates the connection status if accepted.
 *     tags: [Nudges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: The ID of the nudge to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, rejected, expired]
 *                 description: New status of the nudge
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Nudge updated successfully
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
 *                     _id:
 *                       type: string
 *                       description: Nudge ID
 *                     sender:
 *                       type: string
 *                       description: Sender's user ID
 *                     receiver:
 *                       type: string
 *                       description: Receiver's user ID
 *                     status:
 *                       type: string
 *                       description: Updated status (accepted, rejected, or expired)
 *                     amount:
 *                       type: number
 *                       description: Nudge amount
 *                     currency:
 *                       type: string
 *                       description: Currency of the nudge
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *                   example: "Nudge updated successfully"
 *       400:
 *         description: Invalid status or already processed nudge
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
 *                   example: "Nudge already processed"
 *       404:
 *         description: Nudge not found or unauthorized
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
 *                   example: "Nudge not found or unauthorized"
 *       500:
 *         description: Internal server error
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
router.patch("/:id", auth, restrictTo(["investor"]), updateNudge);

/**
 * @swagger
 * /nudges/received:
 *   get:
 *     summary: Get nudges received by startup
 *     description: Retrieves all nudges sent to the authenticated startup from investors.
 *     tags: [Nudges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Received nudges retrieved successfully
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
 *                       _id:
 *                         type: string
 *                         description: Nudge ID
 *                       sender:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Sender's user ID
 *                           firstName:
 *                             type: string
 *                             description: Sender's first name
 *                           lastName:
 *                             type: string
 *                             description: Sender's last name
 *                           profilePicture:
 *                             type: string
 *                             description: URL to sender's profile picture
 *                       receiver:
 *                         type: string
 *                         description: Receiver's user ID
 *                       status:
 *                         type: string
 *                         description: Status of the nudge
 *                       amount:
 *                         type: number
 *                         description: Nudge amount
 *                       currency:
 *                         type: string
 *                         description: Currency of the nudge
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *                   example: "Received nudges retrieved successfully"
 *       403:
 *         description: Access restricted to startups only
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
 *                   example: "Only startups can view received nudges"
 *       500:
 *         description: Internal server error
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
router.get("/received", auth, restrictTo(["startup"]), getNudgesSentToStartup);

/**
 * @swagger
 * /nudges/history:
 *   get:
 *     summary: Get investor's nudge and connection history
 *     description: Retrieves all nudges sent and connections (sent/accepted/pending) for the authenticated investor.
 *     tags: [Nudges]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History retrieved successfully
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
 *                     nudges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Nudge ID
 *                           sender:
 *                             type: string
 *                             description: Sender's user ID (investor)
 *                           receiver:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 description: Receiver's user ID
 *                               firstName:
 *                                 type: string
 *                                 description: Receiver's first name
 *                               lastName:
 *                                 type: string
 *                                 description: Receiver's last name
 *                               profilePicture:
 *                                 type: string
 *                                 description: URL to receiver's profile picture
 *                           status:
 *                             type: string
 *                             description: Status of the nudge
 *                           amount:
 *                             type: number
 *                             description: Nudge amount
 *                           currency:
 *                             type: string
 *                             description: Currency of the nudge
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           expiresAt:
 *                             type: string
 *                             format: date-time
 *                     connections:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Connection ID
 *                           sender:
 *                             type: string
 *                             description: Sender's user ID (investor)
 *                           receiver:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 description: Receiver's user ID
 *                               firstName:
 *                                 type: string
 *                                 description: Receiver's first name
 *                               lastName:
 *                                 type: string
 *                                 description: Receiver's last name
 *                               profilePicture:
 *                                 type: string
 *                                 description: URL to receiver's profile picture
 *                           status:
 *                             type: string
 *                             description: Status of the connection
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                 message:
 *                   type: string
 *                   example: "History retrieved successfully"
 *       403:
 *         description: Access restricted to investors only
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
 *                   example: "Only investors can view nudge and connection history"
 *       500:
 *         description: Internal server error
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
router.get(
  "/history",
  auth,
  restrictTo(["investor"]),
  getInvestorNudgeAndConnectionHistory
);

module.exports = router;
