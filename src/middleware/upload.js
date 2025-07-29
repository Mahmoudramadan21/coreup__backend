const multer = require("multer");
const path = require("path");
const logger = require("../utils/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    logger.info("Multer file filter:", {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      extname: path.extname(file.originalname).toLowerCase(),
      mimetypeValid: mimetype,
      extnameValid: extname,
    });
    if (mimetype && extname) {
      return cb(null, true);
    }
    const error = new Error(
      "Only images (jpg, jpeg, png) and PDFs are allowed"
    );
    logger.error("Multer file filter error:", error.message);
    cb(error);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = { upload };
