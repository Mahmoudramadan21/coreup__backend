const express = require("express");
const router = express.Router();
const { auth, restrictTo } = require("../middleware/auth");
const {
  sendConnection,
  updateConnection,
  getConnections,
} = require("../controllers/connectionsController");

/**
 * @swagger
 * /connections/{id}:
 *   post:
 *     summary: Send a connection request to a startup
 *     description: Allows an authenticated investor to send a connection request to a specific startup.
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: The ID of the startup to connect with
 *     responses:
 *       201:
 *         description: Connection request sent successfully
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
 *                     sender:
 *                       type: string
 *                     receiver:
 *                       type: string
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request or existing connection
 *       403:
 *         description: Access restricted to investors
 *       404:
 *         description: Startup not found
 *       500:
 *         description: Server error
 */
router.post("/:id", auth, restrictTo(["investor"]), sendConnection);

/**
 * @swagger
 * /connections/{id}:
 *   patch:
 *     summary: Update the status of a connection request
 *     description: Allows a startup to accept or reject a pending connection request.
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: The ID of the connection to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [accepted, rejected]
 *                 description: New status of the connection
 *     responses:
 *       200:
 *         description: Connection updated successfully
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
 *                     sender:
 *                       type: string
 *                     receiver:
 *                       type: string
 *                     status:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                     updatedAt:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid status or already processed connection
 *       404:
 *         description: Connection not found or unauthorized
 *       500:
 *         description: Server error
 */
router.patch("/:id", auth, restrictTo(["startup"]), updateConnection);

/**
 * @swagger
 * /connections:
 *   get:
 *     summary: Get user's connection requests
 *     description: Retrieves all connection requests sent (for investors) or received (for startups).
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connections retrieved successfully
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
 *                       sender:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           profilePicture:
 *                             type: string
 *                       receiver:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           profilePicture:
 *                             type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                 message:
 *                   type: string
 *       403:
 *         description: Access restricted to investors and startups
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/", auth, getConnections);

module.exports = router;
