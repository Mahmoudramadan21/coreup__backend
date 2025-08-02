const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const investorRoutes = require("./investorRoutes");
const startupRoutes = require("./startupRoutes");
const connectionsRoutes = require("./connectionsRoutes");
const nudgeRoutes = require("./nudgesRoutes");
const interactionRoutes = require("./interactionRoutes");
const jobRoutes = require("./jobRoutes");
const applicationRoutes = require("./applicationRoutes");
const chatRoutes = require("./chatRoutes");
const notificationRoutes = require("./notificationRoutes");
const paymentRoutes = require("./paymentRoutes");
const contactRoutes = require("./contactRoutes");

const router = express.Router();

/**
 * @swagger
 * /api:
 *   get:
 *     summary: Welcome to CoreUp API
 *     description: Returns a welcome message for the CoreUp API
 *     responses:
 *       200:
 *         description: Welcome message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Welcome to CoreUp API
 */
router.get("/", (req, res) => {
  res.json({ message: "Welcome to CoreUp API" });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/investor", investorRoutes);
router.use("/startups", startupRoutes);
router.use("/connections", connectionsRoutes);
router.use("/nudges", nudgeRoutes);
router.use("/interactions", interactionRoutes);
router.use("/jobs", jobRoutes);
router.use("/applications", applicationRoutes);
router.use("/chat", chatRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payments", paymentRoutes);
router.use("/contact", contactRoutes);

module.exports = router;
