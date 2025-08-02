const express = require("express");
const router = express.Router();
const { auth, restrictTo } = require("../middleware/auth");
const InteractionController = require("../controllers/interactionController");

const getUserTypeRestriction = (userType) =>
  userType === "investor" ? ["investor"] : ["startup"];

/**
 * @swagger
 * tags:
 *   - name: Interactions
 *     description: Endpoints for managing interactions (connections for investors, nudges for startups)
 */

/**
 * @swagger
 * /interactions/{id}:
 *   post:
 *     summary: Send an interaction (connection/nudge)
 *     description: Investors send connection requests to startups; startups send nudges to investors.
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: Receiver's user ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount for nudges (optional, default 0)
 *               message:
 *                 type: string
 *                 description: Optional message
 *     responses:
 *       201:
 *         description: Interaction sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InteractionResponse'
 *       400:
 *         description: Invalid request or limit reached
 *       403:
 *         description: Access mismatch
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:id",
  auth,
  (req, res, next) =>
    restrictTo(getUserTypeRestriction(req.user.userType))(req, res, next),
  InteractionController.sendInteraction
);

/**
 * @swagger
 * /interactions/{id}:
 *   patch:
 *     summary: Update interaction status
 *     description: Receiver (investor or startup) can accept, reject, or mark as expired.
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: Interaction ID
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
 *                 description: New status
 *             required:
 *               - status
 *     responses:
 *       200:
 *         description: Interaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InteractionResponse'
 *       400:
 *         description: Invalid status or already processed
 *       404:
 *         description: Interaction not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/:id",
  auth,
  (req, res, next) =>
    restrictTo(getUserTypeRestriction(req.user.userType))(req, res, next),
  InteractionController.updateInteraction
);

/**
 * @swagger
 * /interactions/{id}:
 *   delete:
 *     summary: Delete a specific interaction
 *     description: Allows the sender or receiver (investor or startup) to delete an interaction.
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: Interaction ID to delete
 *     responses:
 *       204:
 *         description: Interaction deleted successfully
 *       400:
 *         description: Invalid interaction ID
 *       404:
 *         description: Interaction not found or unauthorized
 *       403:
 *         description: Access denied (not sender or receiver)
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id",
  auth,
  (req, res, next) =>
    restrictTo(getUserTypeRestriction(req.user.userType))(req, res, next),
  InteractionController.deleteInteraction
);

/**
 * @swagger
 * /interactions:
 *   get:
 *     summary: Get user's accepted interactions
 *     description: Investors see accepted connections sent to startups; startups see accepted connections received from investors.
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Interactions retrieved successfully
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
 *                       profilePic:
 *                         type: string
 *                       coverPic:
 *                         type: string
 *                       executive:
 *                         type: string
 *                       title:
 *                         type: string
 *                       name:
 *                         type: string
 *                       location:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                       description:
 *                         type: string
 *                       keyPoints:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             label:
 *                               type: string
 *                             value:
 *                               type: any
 *                       totalRequired:
 *                         type: number
 *                       minPerInvestor:
 *                         type: number
 *                       industries:
 *                         type: array
 *                         items:
 *                           type: string
 *                       successPrediction:
 *                         type: object
 *                         properties:
 *                           score:
 *                             type: number
 *                           details:
 *                             type: string
 *                       investmentRange:
 *                         type: object
 *                         properties:
 *                           min:
 *                             type: number
 *                           max:
 *                             type: number
 *                       interactionId:
 *                         type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                 message:
 *                   type: string
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  auth,
  (req, res, next) =>
    restrictTo(getUserTypeRestriction(req.user.userType))(req, res, next),
  InteractionController.getInteractions
);

/**
 * @swagger
 * /interactions/pending:
 *   get:
 *     summary: Get user's pending interactions
 *     description: Investors see pending nudges received from startups; startups see pending connections received from investors.
 *     tags: [Interactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending interactions retrieved successfully
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
 *                       profilePic:
 *                         type: string
 *                       coverPic:
 *                         type: string
 *                       executive:
 *                         type: string
 *                       title:
 *                         type: string
 *                       name:
 *                         type: string
 *                       location:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           city:
 *                             type: string
 *                       description:
 *                         type: string
 *                       keyPoints:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             label:
 *                               type: string
 *                             value:
 *                               type: any
 *                       totalRequired:
 *                         type: number
 *                       minPerInvestor:
 *                         type: number
 *                       industries:
 *                         type: array
 *                         items:
 *                           type: string
 *                       successPrediction:
 *                         type: object
 *                         properties:
 *                           score:
 *                             type: number
 *                           details:
 *                             type: string
 *                       investmentRange:
 *                         type: object
 *                         properties:
 *                           min:
 *                             type: number
 *                           max:
 *                             type: number
 *                       interactionId:
 *                         type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                       amount:
 *                         type: number
 *                       message:
 *                         type: string
 *                 message:
 *                   type: string
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get(
  "/pending",
  auth,
  (req, res, next) =>
    restrictTo(getUserTypeRestriction(req.user.userType))(req, res, next),
  InteractionController.getPendingInteractions
);

/**
 * @swagger
 * /interactions/history:
 *   get:
 *     summary: Get investor's interaction history
 *     description: Investors see all sent connections and received nudges (accepted/rejected).
 *     tags: [Interactions]
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
 *                     sent:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InteractionResponse'
 *                     received:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InteractionResponse'
 *                 message:
 *                   type: string
 *       403:
 *         description: Access restricted to investors
 *       500:
 *         description: Server error
 */
router.get(
  "/history",
  auth,
  restrictTo(["investor"]),
  InteractionController.getHistory
);

/**
 * @swagger
 * components:
 *   schemas:
 *     InteractionResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         sender:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             profilePicture:
 *               type: string
 *             userType:
 *               type: string
 *               enum: [investor, startup, jobseeker, admin]
 *         receiver:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             profilePicture:
 *               type: string
 *             userType:
 *               type: string
 *               enum: [investor, startup, jobseeker, admin]
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected, expired]
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *           enum: [USD, EUR, GBP, VCR]
 *         message:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 */

module.exports = router;
