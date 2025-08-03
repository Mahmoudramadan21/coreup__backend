const express = require("express");
const { auth } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const {
  createPaymentIntent,
  confirmPayment,
} = require("../controllers/paymentController");

const router = express.Router();

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Create a payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number }
 *               currency: { type: string }
 *     responses:
 *       200:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret: { type: string }
 *       401: { description: Unauthorized }
 *       500: { description: Server error }
 */
router.post("/", auth, validate("createPaymentIntent"), createPaymentIntent);

/**
 * @swagger
 * /payments/confirm:
 *   post:
 *     summary: Confirm payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentIntentId]
 *             properties:
 *               paymentIntentId: { type: string }
 *     responses:
 *       200:
 *         description: Payment status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       401: { description: Unauthorized }
 *       404: { description: Payment not found }
 *       500: { description: Server error }
 */
router.post("/confirm", auth, validate("confirmPayment"), confirmPayment);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         userId: { type: string }
 *         amount: { type: number }
 *         currency: { type: string }
 *         paymentIntentId: { type: string }
 *         status: { type: string, enum: [pending, succeeded, failed] }
 */
