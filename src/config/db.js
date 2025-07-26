// src/config/db.js
const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    let retries = 3;
    while (retries) {
      try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 45000,
        });
        logger.info(`✅ Connected to MongoDB: ${conn.connection.host}`);
        break;
      } catch (error) {
        logger.error(
          `❌ MongoDB connection attempt failed: ${error.message}`,
          error.stack
        );
        retries -= 1;
        if (retries === 0) {
          logger.error("❌ No retries left. Exiting...");
          process.exit(1);
        }
        logger.info(`Retrying connection (${retries} attempts left)...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  } catch (error) {
    logger.error(`❌ MongoDB connection error: ${error.message}`, error.stack);
    process.exit(1);
  }
};

module.exports = connectDB;
