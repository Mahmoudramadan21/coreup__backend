const nodemailer = require("nodemailer");
const logger = require("./logger");

/**
 * Send an email using Nodemailer
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @returns {Promise<void>} Resolves when email is sent
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"CoreUp Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to} with subject: ${subject}`);
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw new Error("Failed to send email");
  }
};

module.exports = { sendEmail };
