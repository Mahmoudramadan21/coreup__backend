const Job = require("../models/Job");
const { User } = require("../models/User");
const { sendResponse } = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Create a new job posting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createJob = async (req, res) => {
  try {
    const {
      title,
      tags,
      jobRole,
      salary,
      education,
      experience,
      jobType,
      jobLevel,
      vacancies,
      expirationDate,
      applyMethod,
      applyDetails,
      description,
      responsibilities,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user || user.userType !== "startup") {
      return sendResponse(res, 403, null, "Unauthorized: Must be a startup");
    }

    const job = new Job({
      title,
      tags,
      jobRole,
      salary,
      education,
      experience,
      jobType,
      jobLevel,
      vacancies,
      expirationDate,
      applyMethod,
      applyDetails,
      description,
      responsibilities,
      startupId: req.user.id,
    });

    await job.save();

    logger.info(`Job created: ${job._id} by startup: ${req.user.id}`);
    sendResponse(res, 201, job, "Job created successfully");
  } catch (error) {
    logger.error(
      `Error creating job: ${error.message} - Stack: ${error.stack}`
    );
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return sendResponse(res, 400, null, `Validation failed: ${errors}`);
    }
    if (error.name === "MongoServerError" && error.code === 11000) {
      return sendResponse(res, 400, null, "Duplicate job entry");
    }
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Get all jobs with optional filters and pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getJobs = async (req, res) => {
  try {
    const {
      search,
      jobType,
      jobRole,
      minSalary,
      maxSalary,
      education,
      jobLevel,
      experience,
      startupId,
      minExpirationDate,
      page = 1,
      limit = 10,
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (pageNum < 1 || limitNum < 1) {
      return sendResponse(
        res,
        400,
        null,
        "Page and limit must be positive integers"
      );
    }

    const skip = (pageNum - 1) * limitNum;

    const query = { status: "open" };

    // Text search
    if (search) {
      if (typeof search !== "string" || search.trim().length === 0) {
        return sendResponse(res, 400, null, "Invalid search term");
      }
      query.$text = { $search: search.trim() };
    }

    // Job type filter
    if (jobType) {
      const validJobTypes = ["fullTime", "partTime", "remote", "contract"];
      if (!validJobTypes.includes(jobType)) {
        return sendResponse(
          res,
          400,
          null,
          `Invalid job type. Must be one of: ${validJobTypes.join(", ")}`
        );
      }
      query.jobType = jobType;
    }

    // Job role filter (supports multiple values)
    if (jobRole) {
      const validRoles = [
        "softwareEngineer",
        "productManager",
        "designer",
        "dataAnalyst",
        "marketingSpecialist",
        "other",
      ];
      const roles = jobRole
        .split(",")
        .map((role) => role.trim())
        .filter((role) => role.length > 0);
      if (roles.length === 0) {
        return sendResponse(
          res,
          400,
          null,
          "At least one job role must be provided"
        );
      }
      if (!roles.every((role) => validRoles.includes(role))) {
        return sendResponse(
          res,
          400,
          null,
          `Invalid job role(s). Must be one of: ${validRoles.join(", ")}`
        );
      }
      query.jobRole = { $in: roles };
    }

    // Salary range filter
    if (minSalary || maxSalary) {
      query.salary = {};
      if (minSalary) {
        const min = parseFloat(minSalary);
        if (isNaN(min) || min < 0) {
          return sendResponse(res, 400, null, "Invalid minimum salary");
        }
        query.salary.min = { $gte: min };
      }
      if (maxSalary) {
        const max = parseFloat(maxSalary);
        if (isNaN(max) || max < 0) {
          return sendResponse(res, 400, null, "Invalid maximum salary");
        }
        query.salary.max = { $lte: max };
      }
      if (
        minSalary &&
        maxSalary &&
        parseFloat(maxSalary) < parseFloat(minSalary)
      ) {
        return sendResponse(
          res,
          400,
          null,
          "Maximum salary must be greater than or equal to minimum salary"
        );
      }
    }

    // Education filter (case-insensitive, supports multiple values)
    if (education) {
      const validEducations = [
        "highSchool",
        "bachelor",
        "master",
        "phd",
        "diploma",
        "other",
      ];
      const educations = education
        .split(",")
        .map((edu) => edu.trim())
        .filter((edu) => edu.length > 0);
      if (educations.length === 0) {
        return sendResponse(
          res,
          400,
          null,
          "At least one education level must be provided"
        );
      }
      const regexEducations = educations.map(
        (edu) => new RegExp(`^${edu}$`, "i")
      );
      query.education = { $in: regexEducations };
    }

    // Job level filter (supports multiple values)
    if (jobLevel) {
      const validLevels = ["0-1", "1-3", "3-5", "5+"];
      const levels = jobLevel
        .split(",")
        .map((level) => level.trim())
        .filter((level) => level.length > 0);
      if (levels.length === 0) {
        return sendResponse(
          res,
          400,
          null,
          "At least one job level must be provided"
        );
      }
      if (!levels.every((level) => validLevels.includes(level))) {
        return sendResponse(
          res,
          400,
          null,
          `Invalid job level(s). Must be one of: ${validLevels.join(", ")}`
        );
      }
      query.jobLevel = { $in: levels };
    }

    // Experience filter (supports multiple values)
    if (experience) {
      const validExperiences = [
        "entryLevel",
        "midLevel",
        "seniorLevel",
        "executive",
      ];
      const experiences = experience
        .split(",")
        .map((exp) => exp.trim())
        .filter((exp) => exp.length > 0);
      if (experiences.length === 0) {
        return sendResponse(
          res,
          400,
          null,
          "At least one experience level must be provided"
        );
      }
      if (!experiences.every((exp) => validExperiences.includes(exp))) {
        return sendResponse(
          res,
          400,
          null,
          `Invalid experience level(s). Must be one of: ${validExperiences.join(
            ", "
          )}`
        );
      }
      query.experience = { $in: experiences };
    }

    // Startup ID filter
    if (startupId) {
      if (!mongoose.isValidObjectId(startupId)) {
        return sendResponse(res, 400, null, "Invalid startup ID");
      }
      query.startupId = startupId;
    }

    // Minimum expiration date filter
    if (minExpirationDate) {
      const date = new Date(minExpirationDate);
      if (isNaN(date.getTime())) {
        return sendResponse(res, 400, null, "Invalid expiration date");
      }
      query.expirationDate = { $gte: date };
    }

    logger.info("Query parameters:", req.query);
    logger.info("Applied filters:", query);

    // Get total number of jobs
    const totalJobs = await Job.countDocuments(query);

    // Fetch jobs with pagination
    const jobs = await Job.find(query)
      .populate({
        path: "startupId",
        match: { userType: "startup" },
      })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Filter out jobs where startupId population failed
    const filteredJobs = jobs.filter((job) => job.startupId);

    // Calculate total pages
    const totalPages = Math.ceil(totalJobs / limitNum);

    sendResponse(
      res,
      200,
      {
        jobs: filteredJobs,
        totalJobs,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
      "Jobs retrieved successfully"
    );
  } catch (error) {
    logger.error(
      `Error fetching jobs: ${error.message} - Stack: ${error.stack}`
    );
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};
/**
 * Get job by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate(
        "startupId",
        "firstName lastName email profile.startup profilePicture"
      )
      .lean();
    if (!job) {
      return sendResponse(res, 404, null, "Job not found");
    }
    sendResponse(res, 200, job, "Job retrieved successfully");
  } catch (error) {
    logger.error(
      `Error fetching job: ${error.message} - Stack: ${error.stack}`
    );
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};
/**
 * Update job
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateJob = async (req, res) => {
  try {
    const job = await Job.findOne({
      _id: req.params.id,
      startupId: req.user.id,
    });
    if (!job) {
      return sendResponse(res, 404, null, "Job not found or unauthorized");
    }

    logger.info(
      `Updating job: ${req.params.id} with data: ${JSON.stringify(req.body)}`
    );

    Object.assign(job, req.body);
    await job.save();

    logger.info(`Job updated: ${job._id} by startup: ${req.user.id}`);
    sendResponse(res, 200, job, "Job updated successfully");
  } catch (error) {
    logger.error(
      `Error updating job: ${error.message} - Stack: ${error.stack}`
    );
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors)
        .map((err) => err.message)
        .join(", ");
      return sendResponse(res, 400, null, `Validation failed: ${errors}`);
    }
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Delete job
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      startupId: req.user.id,
    });
    if (!job) {
      return sendResponse(res, 404, null, "Job not found or unauthorized");
    }
    logger.info(`Job deleted: ${req.params.id} by startup: ${req.user.id}`);
    sendResponse(res, 200, null, "Job deleted successfully");
  } catch (error) {
    logger.error(
      `Error deleting job: ${error.message} - Stack: ${error.stack}`
    );
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Get jobs posted by the authenticated startup with pagination
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getMyJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.userType !== "startup") {
      return sendResponse(res, 403, null, "Unauthorized: Must be a startup");
    }

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total number of jobs
    const totalJobs = await Job.countDocuments({ startupId: req.user.id });

    // Get paginated jobs
    const jobs = await Job.find({ startupId: req.user.id })
      .select("title jobType status applicationCount")
      .skip(skip)
      .limit(limit)
      .lean();

    // Map jobs to include application count
    const jobsWithApplicationCount = jobs.map((job) => ({
      _id: job._id,
      title: job.title,
      jobType: job.jobType,
      status: job.status,
      applicationCount: job.applicationCount || 0,
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalJobs / limit);

    logger.info(
      `Fetched ${jobs.length} jobs for startup: ${req.user.id}, page: ${page}, limit: ${limit}`
    );
    sendResponse(
      res,
      200,
      {
        jobs: jobsWithApplicationCount,
        totalJobs,
        currentPage: page,
        totalPages,
      },
      "My jobs retrieved successfully"
    );
  } catch (error) {
    logger.error(
      `Error fetching my jobs: ${error.message} - Stack: ${error.stack}`
    );
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Get all job seekers with pagination and filters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @description Retrieves all job seekers with their profile picture, full name, location, years of experience,
 * and supports filtering by name, location, and experience range. Includes pagination.
 * @query {string} [search] - Search term for full name
 * @query {string} [location] - Filter by country or city (partial match)
 * @query {number} [minExperience] - Minimum years of experience
 * @query {number} [maxExperience] - Maximum years of experience
 * @query {number} [page=1] - Page number
 * @query {number} [limit=10] - Items per page
 */
const getAllJobSeekers = async (req, res) => {
  try {
    const {
      search,
      location,
      minExperience,
      maxExperience,
      page = 1,
      limit = 10,
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (pageNum < 1 || limitNum < 1) {
      return sendResponse(
        res,
        400,
        null,
        "Page and limit must be positive integers"
      );
    }

    const skip = (pageNum - 1) * limitNum;

    // Build query object
    const query = { userType: "jobseeker" };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
      ];
    }
    if (location) {
      query.$or = [
        { "location.country": { $regex: location, $options: "i" } },
        { "location.city": { $regex: location, $options: "i" } },
      ];
    }
    if (minExperience || maxExperience) {
      query["profile.jobseeker.yearsOfExperience"] = {};
      if (minExperience)
        query["profile.jobseeker.yearsOfExperience"]["$gte"] = parseInt(
          minExperience,
          10
        );
      if (maxExperience)
        query["profile.jobseeker.yearsOfExperience"]["$lte"] = parseInt(
          maxExperience,
          10
        );
    }

    // Get total count for pagination
    const totalJobSeekers = await User.countDocuments(query);

    // Fetch job seekers with pagination and populate necessary fields
    const jobSeekers = await User.find(query)
      .select(
        "firstName lastName profilePicture profile.jobseeker.yearsOfExperience location _id" // Added _id to the select
      )
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Map to include full name, id, and handle null values
    const formattedJobSeekers = jobSeekers.map((jobSeeker) => ({
      id: jobSeeker._id, // Added id from the document
      fullName:
        jobSeeker.fullName ||
        `${jobSeeker.firstName || ""} ${jobSeeker.lastName || ""}`.trim(),
      profilePicture: jobSeeker.profilePicture || null,
      yearsOfExperience: jobSeeker.profile?.jobseeker?.yearsOfExperience || 0,
      location: jobSeeker.location
        ? `${jobSeeker.location.city || ""}, ${
            jobSeeker.location.country || ""
          }`.trim()
        : null,
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalJobSeekers / limitNum);

    logger.info(
      `Fetched ${
        formattedJobSeekers.length
      } job seekers, page: ${pageNum}, limit: ${limitNum}, filters: ${JSON.stringify(
        { search, location, minExperience, maxExperience }
      )}`
    );

    sendResponse(
      res,
      200,
      {
        jobSeekers: formattedJobSeekers,
        totalJobSeekers,
        currentPage: pageNum,
        totalPages,
        limit: limitNum,
      },
      "Job seekers retrieved successfully"
    );
  } catch (error) {
    logger.error(
      `Error fetching job seekers: ${error.message} - Stack: ${error.stack}`
    );
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

/**
 * Get job seeker profile by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @description Retrieves the complete profile of a job seeker by their ID.
 * @param {string} req.params.id - The ID of the job seeker
 */
const getJobSeekerProfile = async (req, res) => {
  try {
    const jobSeeker = await User.findOne({
      _id: req.params.id,
      userType: "jobseeker",
    });

    if (!jobSeeker) {
      return sendResponse(res, 404, null, "Job seeker not found");
    }

    logger.info(`Fetched job seeker profile: ${req.params.id}`);
    sendResponse(
      res,
      200,
      jobSeeker,
      "Job seeker profile retrieved successfully"
    );
  } catch (error) {
    logger.error(
      `Error fetching job seeker profile: ${error.message} - Stack: ${error.stack}`
    );
    if (error.name === "CastError") {
      return sendResponse(res, 400, null, "Invalid job seeker ID");
    }
    sendResponse(res, 500, null, `Server error: ${error.message}`);
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  getMyJobs,
  getAllJobSeekers,
  getJobSeekerProfile,
};
