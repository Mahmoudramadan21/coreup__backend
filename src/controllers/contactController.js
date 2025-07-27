const Contact = require("../models/Contact");
const { sendEmail } = require("../utils/sendEmail");
const { sendResponse } = require("../utils/response");

/**
 * Submit a contact form
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const submitContactForm = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;
    const attachment = req.file?.path;
    const contact = new Contact({
      firstName,
      lastName,
      email,
      phone,
      message,
      attachment,
      status: "open",
    });
    await contact.save();
    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: "New Contact Form Submission",
      html: `
        <h1>New Contact Form Submission</h1>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong> ${message}</p>
        ${
          attachment
            ? `<p><strong>Attachment:</strong> <a href="${attachment}">View Attachment</a></p>`
            : ""
        }
      `,
    });
    sendResponse(res, 201, contact, "Contact form submitted successfully");
  } catch (error) {
    sendResponse(res, 500, null, "Server error");
  }
};

/**
 * Get all contact submissions (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getContactSubmissions = async (req, res) => {
  try {
    if (req.user.userType !== "admin") {
      return sendResponse(res, 403, null, "Unauthorized: Admins only");
    }
    const submissions = await Contact.find().sort({ createdAt: -1 }).lean();
    sendResponse(
      res,
      200,
      submissions,
      "Contact submissions retrieved successfully"
    );
  } catch (error) {
    sendResponse(res, 500, null, "Server error");
  }
};

/**
 * Update contact submission status (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (req.user.userType !== "admin") {
      return sendResponse(res, 403, null, "Unauthorized: Admins only");
    }
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!contact) {
      return sendResponse(res, 404, null, "Contact submission not found");
    }
    sendResponse(res, 200, contact, "Contact status updated successfully");
  } catch (error) {
    sendResponse(res, 500, null, "Server error");
  }
};

module.exports = {
  submitContactForm,
  getContactSubmissions,
  updateContactStatus,
};
