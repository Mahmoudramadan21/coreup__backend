const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");
require("dotenv").config();
const logger = require("../utils/logger");
const path = require("path"); // Added for handling file extensions

/**
 * Uploads a file buffer to Cloudinary using streaming
 * @param {Buffer} buffer - File buffer to upload
 * @param {Object} options - Custom upload options
 * @param {String} [originalname] - Original filename to include extension in public_id
 * @returns {Promise} - Resolves with upload result or rejects with error
 */
const uploadToCloud = async (buffer, options, originalname) => {
  return new Promise((resolve, reject) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      logger.error("Invalid or missing buffer for Cloudinary upload");
      return reject(new Error("Invalid or missing file buffer"));
    }

    if (!originalname) {
      logger.error("No original filename provided");
      return reject(new Error("No original filename provided"));
    }

    const uploadOptions = {
      ...options,
      timestamp: Math.round(Date.now() / 1000),
      unique_filename: true,
      overwrite: false,
      resource_type: options.resource_type || "auto",
    };

    if (uploadOptions.resource_type === "raw") {
      const ext = path.extname(originalname).toLowerCase();
      let basename = path.basename(originalname, ext);
      basename = basename.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
      uploadOptions.public_id = `${Date.now()}-${basename}`;
    }

    logger.info("Cloudinary upload options:", {
      folder: uploadOptions.folder,
      resource_type: uploadOptions.resource_type,
      allowed_formats: uploadOptions.allowed_formats || "Not specified",
      public_id: uploadOptions.public_id || "Not specified",
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          const errorObject = {
            message: error.message,
            http_code: error.http_code,
            name: error.name,
            stack: error.stack,
          };
          logger.error("Cloudinary upload error:", errorObject);
          return reject(new Error(`Upload failed: ${error.message}`));
        }

        if (!result?.secure_url || !result?.public_id) {
          logger.error(
            "Cloudinary response missing secure_url or public_id:",
            result
          );
          return reject(
            new Error(
              "Invalid Cloudinary response: Missing secure_url or public_id"
            )
          );
        }

        logger.info("Cloudinary upload successful:", {
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
        });
        resolve(result);
      }
    );

    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);
    bufferStream.on("error", (err) => {
      logger.error("Buffer stream error:", {
        message: err.message,
        stack: err.stack,
      });
      reject(new Error("Failed to process file stream"));
    });
    bufferStream.pipe(uploadStream);
  });
};

module.exports = { uploadToCloud };
