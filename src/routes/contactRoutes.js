const express = require("express");
const { auth, restrictTo } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { upload } = require("../middleware/upload");
const {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus,
} = require("../controllers/contactController");

const router = express.Router();

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Submit a contact form
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, message]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               message: { type: string }
 *               attachment: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: Contact form submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       500: { description: Server error }
 */
router.post(
  "/",
  upload.single("attachment"),
  validate("contact"),
  submitContactForm
);

/**
 * @swagger
 * /contact:
 *   get:
 *     summary: Get all contact submissions (admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contact submissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Contact'
 *       401: { description: Unauthorized }
 *       403: { description: Admins only }
 *       500: { description: Server error }
 */
router.get("/", auth, restrictTo(["admin"]), getContactSubmissions);

/**
 * @swagger
 * /contact/{id}:
 *   put:
 *     summary: Update contact submission status (admin only)
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [open, resolved] }
 *     responses:
 *       200:
 *         description: Contact status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Contact'
 *       401: { description: Unauthorized }
 *       403: { description: Admins only }
 *       404: { description: Contact submission not found }
 *       500: { description: Server error }
 */
router.put(
  "/:id",
  auth,
  restrictTo(["admin"]),
  validate("updateContactStatus"),
  updateContactStatus
);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Contact:
 *       type: object
 *       properties:
 *         firstName: { type: string }
 *         lastName: { type: string }
 *         email: { type: string }
 *         phone: { type: string }
 *         message: { type: string }
 *         attachment: { type: string }
 *         status: { type: string, enum: [open, resolved] }
 */
