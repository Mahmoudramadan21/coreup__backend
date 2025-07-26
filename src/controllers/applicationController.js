const Application = require("../models/Application");
const Job = require("../models/Job");
const { User, Jobseeker, Investor, Startup } = require("../models/User");
const { sendResponse } = require("../utils/response");
const { createNotification } = require("./notificationController");
const logger = require("../utils/logger");
const { uploadToCloud } = require("../services/cloudService");
const cloudinary = require("../config/cloudinary");
const path = require("path");

/**
 * Apply for a job
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const applyForJob = async (req, res) => {
  try {
    const jobId = req.params.jobId; // Get jobId from URL params
    const { coverLetter } = req.body;
    const userId = req.user.id;
    const file = req.file;

    logger.info(
      `Received application request: jobId=${jobId}, userId=${userId}, file=${
        file?.originalname
      }, coverLetter=${coverLetter ? "provided" : "not provided"}`
    );

    if (!file) {
      logger.error("No CV file uploaded or multer failed to process the file");
      return sendResponse(res, 400, null, "CV is required");
    }

    const job = await Job.findById(jobId);
    if (!job) {
      logger.error(`Job not found: jobId=${jobId}`);
      return sendResponse(res, 400, null, "Job not found");
    }
    if (job.status !== "open") {
      logger.error(`Job is closed: jobId=${jobId}, status=${job.status}`);
      return sendResponse(res, 400, null, "Job is closed");
    }

    if (req.user.userType !== "jobseeker") {
      logger.error(`Unauthorized user type: ${req.user.userType}`);
      return sendResponse(res, 403, null, "Unauthorized: Must be a jobseeker");
    }

    const existingApplication = await Application.findOne({ jobId, userId });
    if (existingApplication) {
      logger.warn(`Duplicate application: jobId=${jobId}, userId=${userId}`);
      return sendResponse(
        res,
        400,
        null,
        "You have already applied for this job"
      );
    }

    // Upload CV to Cloudinary
    const uploadOptions = {
      folder: "cvs",
      resource_type: file.mimetype.startsWith("image/") ? "image" : "raw",
      allowed_formats: ["jpeg", "jpg", "png", "pdf"],
    };
    const uploadResult = await uploadToCloud(
      file.buffer,
      uploadOptions,
      file.originalname
    );
    const cvUrl = uploadResult.secure_url;
    const cvPublicId = uploadResult.public_id;

    const application = new Application({
      jobId,
      userId,
      startupId: job.startupId,
      cv: cvUrl,
      cvPublicId,
      coverLetter,
    });
    await application.save();

    // Update Job's applications array and applicationCount
    job.applications = job.applications || [];
    job.applications.push(application._id);
    job.applicationCount = (job.applicationCount || 0) + 1;
    await job.save();

    try {
      await createNotification({
        userId: job.startupId,
        type: "application",
        message: `New application received for job: ${job.title}`,
        link: `/jobs/${jobId}/applications/${application._id}`,
      });
    } catch (notificationError) {
      logger.error(
        `Failed to create notification: ${notificationError.message}`
      );
    }

    logger.info(
      `Application ${application._id} submitted for job: ${jobId} by user: ${userId}`
    );
    sendResponse(res, 201, application, "Application submitted successfully");
  } catch (error) {
    logger.error(
      `Error applying for job: ${error.message} - Stack: ${error.stack}`
    );
    if (
      error.message.includes(
        "Only images (jpg, jpeg, png) and PDFs are allowed"
      )
    ) {
      return sendResponse(
        res,
        400,
        null,
        "Only images (jpg, jpeg, png) and PDFs are allowed"
      );
    }
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Get applications for a job (for startup)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @description Retrieves applications with user details (firstName, lastName, email, skills, education, experiences, yearsOfExperience, profilePicture).
 * Also retrieves the job title. Supports sorting by createdAt (newest or oldest) and pagination.
 */
const getJobApplications = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      startupId: req.user.id,
    }).select("title");
    if (!job) {
      logger.error(
        `Job not found or unauthorized: jobId=${req.params.jobId}, userId=${req.user.id}`
      );
      return sendResponse(res, 404, null, "Job not found or unauthorized");
    }

    const { sort, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    let sortOption = {};
    if (sort === "newest") {
      sortOption = { createdAt: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    const query = { jobId: req.params.jobId };
    const totalApplications = await Application.countDocuments(query);
    const applications = await Application.find(query)
      .populate(
        "userId",
        "firstName lastName email profile.jobseeker.skills profile.jobseeker.education profile.jobseeker.experiences profile.jobseeker.yearsOfExperience profilePicture"
      )
      .select("cv coverLetter status createdAt")
      .sort(sortOption)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const paginationData = {
      total: totalApplications,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalApplications / limitNum),
    };

    logger.info(
      `Fetched ${applications.length} applications for job: ${
        req.params.jobId
      }, sort: ${sort || "default"}, page: ${pageNum}, limit: ${limitNum}`
    );
    sendResponse(
      res,
      200,
      {
        jobTitle: job.title,
        applications,
        pagination: paginationData,
      },
      "Applications retrieved successfully"
    );
  } catch (error) {
    logger.error(
      `Error fetching applications: ${error.message} - Stack: ${error.stack}`
    );
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Get application by ID (for startup)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @description Retrieves a single application with full details of the application and jobseeker.
 * Only accessible by the startup that owns the job.
 * @route GET /api/v1/applications/:id
 * @access Private (Startup only)
 */
const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate({
        path: "userId",
        select:
          "firstName lastName profilePicture email phone nationality birthdate gender location profile.jobseeker",
      })
      .populate({
        path: "jobId",
        select:
          "title jobRole salary education experience jobType vacancies expirationDate applyMethod applyDetails description responsibilities",
      })
      .lean();

    if (!application) {
      logger.error(`Application not found: id=${req.params.id}`);
      return sendResponse(res, 404, null, "Application not found");
    }

    // Check if the authenticated user is the startup that owns the job
    if (application.startupId.toString() !== req.user.id) {
      logger.error(
        `Unauthorized access to application: id=${req.params.id}, userId=${req.user.id}`
      );
      return sendResponse(
        res,
        403,
        null,
        "Unauthorized: You do not own this job"
      );
    }

    logger.info(
      `Fetched application ${application._id} for startup: ${req.user.id}`
    );
    sendResponse(res, 200, application, "Application retrieved successfully");
  } catch (error) {
    logger.error(
      `Error fetching application: ${error.message} - Stack: ${error.stack}`
    );
    if (error.name === "CastError") {
      return sendResponse(res, 400, null, "Invalid application ID");
    }
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Update application status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id).populate(
      "jobId"
    );
    if (!application) {
      logger.error(`Application not found: id=${req.params.id}`);
      return sendResponse(res, 404, null, "Application not found");
    }
    if (application.jobId.startupId.toString() !== req.user.id) {
      logger.error(
        `Unauthorized access to application: id=${req.params.id}, userId=${req.user.id}`
      );
      return sendResponse(res, 403, null, "Unauthorized");
    }
    application.status = status;
    await application.save();

    // Create notification for jobseeker
    await createNotification({
      userId: application.userId,
      type: "application",
      message: `Your application for ${application.jobId.title} has been ${status}`,
      link: `/applications/${application._id}`,
    });

    logger.info(`Application ${application._id} status updated to: ${status}`);
    sendResponse(res, 200, application, "Application status updated");
  } catch (error) {
    logger.error(
      `Error updating application status: ${error.message} - Stack: ${error.stack}`
    );
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Delete an application
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      startupId: req.user.id,
    }).populate("jobId");

    if (!application) {
      logger.error(
        `Application not found or unauthorized: id=${req.params.id}, userId=${req.user.id}`
      );
      return sendResponse(
        res,
        404,
        null,
        "Application not found or unauthorized"
      );
    }

    // Delete CV from Cloudinary
    if (application.cvPublicId) {
      await cloudinary.uploader
        .destroy(application.cvPublicId, {
          resource_type: "raw",
        })
        .catch((err) => {
          logger.warn(`Failed to delete CV from Cloudinary: ${err.message}`);
        });
    }

    // Create notification for jobseeker
    try {
      await createNotification({
        userId: application.userId,
        type: "application",
        message: `Your application for ${application.jobId.title} has been deleted`,
        link: `/jobs/${application.jobId._id}`,
      });
    } catch (notificationError) {
      logger.error(
        `Failed to create notification: ${notificationError.message}`
      );
    }

    logger.info(
      `Application ${application._id} deleted by user: ${req.user.id}`
    );
    sendResponse(res, 200, null, "Application deleted successfully");
  } catch (error) {
    logger.error(
      `Error deleting application: ${error.message} - Stack: ${error.stack}`
    );
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Hire an applicant for a job
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @description Updates the application status to 'accepted', decrements job vacancies if available,
 * and notifies the jobseeker. Only accessible by the startup that owns the job.
 * @route PUT /api/v1/applications/:id/hire
 * @access Private (Startup only)
 */
const hireApplicant = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { id: startupId } = req.user;

    // Fetch the application with populated job details including title
    const application = await Application.findById(applicationId)
      .populate({
        path: "jobId",
        select: "startupId vacancies status title", // Added title to select
      })
      .populate("userId", "firstName lastName email")
      .lean();

    if (!application) {
      logger.error(`Application not found: id=${applicationId}`);
      return sendResponse(res, 404, null, "Application not found");
    }

    // Check authorization
    if (application.jobId.startupId.toString() !== startupId) {
      logger.error(
        `Unauthorized access to hire applicant: id=${applicationId}, userId=${startupId}`
      );
      return sendResponse(
        res,
        403,
        null,
        "Unauthorized: You do not own this job"
      );
    }

    // Check if job is still open and has vacancies
    if (application.jobId.status !== "open") {
      logger.error(`Job is closed: jobId=${application.jobId._id}`);
      return sendResponse(res, 400, null, "Job is closed");
    }
    if (application.jobId.vacancies <= 0) {
      logger.error(`No vacancies left: jobId=${application.jobId._id}`);
      return sendResponse(res, 400, null, "No vacancies available");
    }

    // Update application status to 'accepted'
    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { status: "accepted" },
      { new: true, runValidators: true }
    ).populate({
      path: "jobId",
      select: "startupId vacancies status title", // Ensure title is included here too
    });

    // Update job vacancies and status if no vacancies left
    const job = await Job.findById(application.jobId._id);
    job.vacancies -= 1;
    if (job.vacancies === 0) {
      job.status = "closed";
    }
    await job.save();

    // Create notification for jobseeker
    await createNotification({
      userId: application.userId._id,
      type: "application",
      message: `Congratulations! You have been hired for ${
        application.jobId.title || "the job"
      }`, // Fallback to "the job" if title is undefined
      link: `/applications/${applicationId}`,
    });

    // Optional: Notify other applicants that the job is filled (if desired)
    const otherApplications = await Application.find({
      jobId: application.jobId._id,
      _id: { $ne: applicationId },
      status: "pending",
    });
    for (const otherApp of otherApplications) {
      await createNotification({
        userId: otherApp.userId,
        type: "application",
        message: `The job ${
          application.jobId.title || "this job"
        } has been filled`, // Fallback to "this job"
        link: `/jobs/${application.jobId._id}`,
      });
      await Application.findByIdAndUpdate(otherApp._id, { status: "rejected" });
    }

    logger.info(
      `Applicant hired: applicationId=${applicationId}, jobId=${application.jobId._id}, userId=${application.userId._id}`
    );
    sendResponse(res, 200, updatedApplication, "Applicant hired successfully");
  } catch (error) {
    logger.error(
      `Error hiring applicant: ${error.message} - Stack: ${error.stack}`
    );
    if (error.name === "CastError") {
      return sendResponse(res, 400, null, "Invalid application ID");
    }
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

module.exports = {
  applyForJob,
  getJobApplications,
  updateApplicationStatus,
  deleteApplication,
  getApplicationById,
  hireApplicant,
};
