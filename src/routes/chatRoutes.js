// src/routes/chatRoutes.js
const express = require("express");
const { body, param } = require("express-validator");
const { auth, restrictTo } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
  startConversation,
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markMessageAsRead,
  deleteConversation,
} = require("../controllers/chatController");

const router = express.Router();

/**
 * @swagger
 * /chat/start:
 *   post:
 *     summary: Start a new conversation
 *     description: Creates or retrieves a conversation between the authenticated user and another user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [participantId]
 *             properties:
 *               participantId:
 *                 type: string
 *                 format: ObjectId
 *                 description: ID of the user to start a conversation with
 *     responses:
 *       200:
 *         description: Conversation started or retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Conversation'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid participant ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.post(
  "/start",
  auth,
  [body("participantId").isMongoId().withMessage("Invalid participant ID")],
  startConversation
);

/**
 * @swagger
 * /chat/message:
 *   post:
 *     summary: Send a message
 *     description: Sends a text message or attachment in a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               conversationId:
 *                 type: string
 *                 format: ObjectId
 *                 description: ID of the conversation
 *               content:
 *                 type: string
 *                 description: Text content of the message (optional if attachment is provided)
 *               attachment:
 *                 type: string
 *                 format: binary
 *                 description: Optional file attachment (JPEG, PNG, PDF)
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or no content/attachment provided
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.post(
  "/message",
  auth,
  upload.single("attachment"),
  [
    body("conversationId").isMongoId().withMessage("Invalid conversation ID"),
    body("content")
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage("Message content cannot exceed 2000 characters"),
  ],
  (req, res) => sendMessage(req, res, req.app.get("io"))
);

/**
 * @swagger
 * /chat/messages/{conversationId}:
 *   get:
 *     summary: Retrieve messages for a conversation
 *     description: Retrieves paginated messages for a specific conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: ID of the conversation
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
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
 *                     $ref: '#/components/schemas/Message'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid conversation ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: User not authorized to view conversation
 *       500:
 *         description: Server error
 */
router.get(
  "/messages/:conversationId",
  auth,
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID")],
  getConversationMessages
);

/**
 * @swagger
 * /chat/conversations:
 *   get:
 *     summary: Retrieve all conversations for a user
 *     description: Retrieves all conversations the authenticated user is part of
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
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
 *                     $ref: '#/components/schemas/Conversation'
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 */
router.get("/conversations", auth, getUserConversations);

/**
 * @swagger
 * /chat/message/{messageId}/read:
 *   put:
 *     summary: Mark a message as read
 *     description: Marks a specific message as read by the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: ID of the message to mark as read
 *     responses:
 *       200:
 *         description: Message marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid message ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: User not authorized to mark message as read
 *       500:
 *         description: Server error
 */
router.put(
  "/message/:messageId/read",
  auth,
  [param("messageId").isMongoId().withMessage("Invalid message ID")],
  (req, res) => markMessageAsRead(req, res, req.app.get("io"))
);

/**
 * @swagger
 * /chat/conversation/{conversationId}:
 *   delete:
 *     summary: Delete a conversation
 *     description: Deletes a conversation and all its associated messages for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         schema:
 *           type: string
 *           format: ObjectId
 *         required: true
 *         description: ID of the conversation to delete
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
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
 *       400:
 *         description: Invalid conversation ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: User not authorized to delete conversation
 *       500:
 *         description: Server error
 */
router.delete(
  "/conversation/:conversationId",
  auth,
  [param("conversationId").isMongoId().withMessage("Invalid conversation ID")],
  (req, res) => deleteConversation(req, res, req.app.get("io"))
);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Conversation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Conversation ID
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               userType:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *           description: Users participating in the conversation
 *         lastMessage:
 *           $ref: '#/components/schemas/Message'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Message:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Message ID
 *         conversationId:
 *           type: string
 *           description: ID of the conversation
 *         sender:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             firstName:
 *               type: string
 *             lastName:
 *               type: string
 *             userType:
 *               type: string
 *             profilePicture:
 *               type: string
 *           description: Sender of the message
 *         content:
 *           type: string
 *           description: Text content of the message
 *         attachment:
 *           type: object
 *           properties:
 *             url:
 *               type: string
 *             public_id:
 *               type: string
 *             resource_type:
 *               type: string
 *               enum: [image, raw]
 *           description: Attached file (image or PDF)
 *         read:
 *           type: boolean
 *           description: Whether the message has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

module.exports = router;
