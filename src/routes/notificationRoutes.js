const express = require("express");
const { auth } = require("../middleware/auth");
const {
  getNotifications,
  markAsRead,
} = require("../controllers/notificationController");

const router = express.Router();

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 */
router.get("/", auth, getNotifications);

/**
 * @swagger
 * /notifications/{id}:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       401: { description: Unauthorized }
 *       404: { description: Notification not found }
 *       500: { description: Server error }
 */
router.put("/:id", auth, markAsRead);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         userId: { type: string }
 *         type: { type: string, enum: [job, application, message, investment] }
 *         message: { type: string }
 *         link: { type: string }
 *         read: { type: boolean }
 */
