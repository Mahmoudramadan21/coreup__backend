const express = require("express");
const { auth, restrictTo } = require("../middleware/auth");
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  getMyJobs,
  getAllJobSeekers,
  getJobSeekerProfile, // Import the new method
} = require("../controllers/jobController");

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       required:
 *         - title
 *         - jobRole
 *         - salary
 *         - education
 *         - jobLevel
 *         - experience
 *         - jobType
 *         - vacancies
 *         - expirationDate
 *         - applyMethod
 *         - applyDetails
 *         - description
 *         - responsibilities
 *         - startupId
 *       properties:
 *         _id:
 *           type: string
 *           description: Job ID
 *         title:
 *           type: string
 *           maxLength: 100
 *           description: Job title
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *           description: Keywords or tags for the job
 *         jobRole:
 *           type: string
 *           enum: [softwareEngineer, productManager, designer, dataAnalyst, marketingSpecialist, other]
 *           description: Role of the job (e.g., softwareEngineer, productManager)
 *         salary:
 *           type: object
 *           required: [min, max, type]
 *           properties:
 *             min:
 *               type: number
 *               minimum: 0
 *               description: Minimum salary
 *             max:
 *               type: number
 *               minimum: 0
 *               description: Maximum salary
 *             type:
 *               type: string
 *               enum: [hourly, monthly, yearly]
 *               description: Salary type (hourly, monthly, yearly)
 *         education:
 *           type: string
 *           enum: [highSchool, bachelor, master, phd, diploma, other]
 *           description: Required education level (e.g., bachelor, master)
 *         jobLevel:
 *           type: string
 *           enum: ["0-1", "1-3", "3-5", "5+"]
 *           description: Required years of experience (e.g., 1-3, 5+)
 *         experience:
 *           type: string
 *           enum: [entryLevel, midLevel, seniorLevel, executive]
 *           description: Experience level (e.g., entryLevel, seniorLevel)
 *         jobType:
 *           type: string
 *           enum: [fullTime, partTime, remote, contract]
 *           description: Type of job (e.g., fullTime, remote)
 *         vacancies:
 *           type: number
 *           minimum: 1
 *           description: Number of available positions
 *         expirationDate:
 *           type: string
 *           format: date-time
 *           description: Job application deadline
 *         applyMethod:
 *           type: string
 *           enum: [external, email]
 *           description: Application method (external URL or email)
 *         applyDetails:
 *           type: string
 *           description: URL (for external) or email address (for email)
 *         description:
 *           type: string
 *           maxLength: 2000
 *           description: Job description
 *         responsibilities:
 *           type: array
 *           items:
 *             type: String
 *           minItems: 1
 *           description: Job responsibilities
 *         startupId:
 *           type: string
 *           description: ID of the startup posting the job
 *         status:
 *           type: string
 *           enum: [open, closed]
 *           default: open
 *           description: Job status
 *         applications:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs of applications for the job
 *         applicationCount:
 *           type: number
 *           minimum: 0
 *           default: 0
 *           description: Number of applications
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         startup:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *               description: First name of the startup owner
 *             lastName:
 *               type: string
 *               description: Last name of the startup owner
 *             email:
 *               type: string
 *               description: Email of the startup owner
 *             profile:
 *               type: object
 *               properties:
 *                 startup:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Name of the startup
 *           description: Populated startup details
 */

/**
 * @swagger
 * /jobs:
 *   post:
 *     summary: Create a new job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Job'
 *           example:
 *             title: "Senior Software Engineer"
 *             tags: ["JavaScript", "Node.js", "React"]
 *             jobRole: "Developer"
 *             salary:
 *               min: 50000
 *               max: 80000
 *               type: "yearly"
 *             education: "Bachelor"
 *             experience: "Senior Level"
 *             jobType: "full-time"
 *             vacancies: 2
 *             expirationDate: "2025-12-31T23:59:59.000Z"
 *             applyMethod: "email"
 *             applyDetails: "careers@startup.com"
 *             description: "We are looking for a skilled software engineer to join our team..."
 *             responsibilities:
 *               - "Develop and maintain web applications"
 *               - "Collaborate with cross-functional teams"
 *               - "Ensure code quality and performance"
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *             example:
 *               success: false
 *               data: null
 *               message: "Job title is required"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.post("/", auth, restrictTo(["startup"]), createJob);

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: Get all jobs with optional filters
 *     description: Retrieves jobs with optional filters for search, job type, role, salary range, education, job level, experience, startup ID, and minimum expiration date
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title, description, or tags
 *       - in: query
 *         name: jobType
 *         schema:
 *           type: string
 *           enum: [fullTime, partTime, remote, contract]
 *         description: Filter by job type
 *       - in: query
 *         name: jobRole
 *         schema:
 *           type: string
 *         description: Filter by job role (comma-separated for multiple, e.g., "softwareEngineer,designer")
 *       - in: query
 *         name: minSalary
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum salary filter
 *       - in: query
 *         name: maxSalary
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum salary filter
 *       - in: query
 *         name: education
 *         schema:
 *           type: string
 *         description: Filter by education level (comma-separated for multiple, e.g., "bachelor,master")
 *       - in: query
 *         name: jobLevel
 *         schema:
 *           type: string
 *         description: Filter by job level (comma-separated for multiple, e.g., "0-1,3-5")
 *       - in: query
 *         name: experience
 *         schema:
 *           type: string
 *         description: Filter by experience level (comma-separated for multiple, e.g., "entryLevel,midLevel")
 *       - in: query
 *         name: startupId
 *         schema:
 *           type: string
 *         description: Filter by startup ID
 *       - in: query
 *         name: minExpirationDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter jobs expiring on or after this date (e.g., "2025-07-15")
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Job'
 *       400:
 *         description: Invalid query parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.get("/", getJobs);

/**
 * @swagger
 * /jobs/my-jobs:
 *   get:
 *     summary: Get jobs posted by the authenticated startup with pagination
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of jobs per page
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Job ID
 *                           title:
 *                             type: string
 *                             description: Job title
 *                           jobType:
 *                             type: string
 *                             enum: [full-time, part-time, remote, contract]
 *                             description: Type of job
 *                           status:
 *                             type: string
 *                             enum: [open, closed]
 *                             description: Job status
 *                           applicationCount:
 *                             type: number
 *                             description: Number of applications received
 *                     totalJobs:
 *                       type: number
 *                       description: Total number of jobs
 *                     currentPage:
 *                       type: number
 *                       description: Current page number
 *                     totalPages:
 *                       type: number
 *                       description: Total number of pages
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               data:
 *                 jobs:
 *                   - _id: "1234567890abcdef12345678"
 *                     title: "Senior Software Engineer"
 *                     jobType: "full-time"
 *                     status: "open"
 *                     applicationCount: 5
 *                   - _id: "abcdef1234567890abcdef12"
 *                     title: "Product Manager"
 *                     jobType: "remote"
 *                     status: "closed"
 *                     applicationCount: 10
 *                 totalJobs: 15
 *                 currentPage: 1
 *                 totalPages: 2
 *               message: "My jobs retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.get("/my-jobs", auth, restrictTo(["startup"]), getMyJobs);

/**
 * @swagger
 * /jobs/job-seekers:
 *   get:
 *     summary: Get all job seekers with pagination and filters
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search term for full name (partial match)
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *         description: Filter by country or city (partial match)
 *       - in: query
 *         name: minExperience
 *         schema: { type: number, minimum: 0 }
 *         description: Minimum years of experience
 *       - in: query
 *         name: maxExperience
 *         schema: { type: number, minimum: 0 }
 *         description: Maximum years of experience
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of job seekers per page
 *     responses:
 *       200:
 *         description: Job seekers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobSeekers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fullName:
 *                             type: string
 *                             description: Full name of the job seeker
 *                           profilePicture:
 *                             type: string
 *                             nullable: true
 *                             description: URL of the profile picture
 *                           yearsOfExperience:
 *                             type: number
 *                             minimum: 0
 *                             description: Years of experience
 *                           location:
 *                             type: string
 *                             nullable: true
 *                             description: City and country of the job seeker
 *                     totalJobSeekers:
 *                       type: number
 *                       description: Total number of job seekers
 *                     currentPage:
 *                       type: number
 *                       description: Current page number
 *                     totalPages:
 *                       type: number
 *                       description: Total number of pages
 *                     limit:
 *                       type: number
 *                       description: Number of items per page
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               data:
 *                 jobSeekers:
 *                   - fullName: "John Doe"
 *                     profilePicture: "https://res.cloudinary.com/donozizpw/image/upload/v123456789/profile.jpg"
 *                     yearsOfExperience: 7
 *                     location: "Cairo, Egypt"
 *                   - fullName: "Jane Smith"
 *                     profilePicture: null
 *                     yearsOfExperience: 6
 *                     location: "Alexandria, Egypt"
 *                 totalJobSeekers: 50
 *                 currentPage: 1
 *                 totalPages: 10
 *                 limit: 5
 *               message: "Job seekers retrieved successfully"
 *       400:
 *         description: Invalid pagination parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *             example:
 *               success: false
 *               data: null
 *               message: "Page and limit must be positive integers"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.get("/job-seekers", auth, getAllJobSeekers);

/**
 * @swagger
 * /jobs/job-seekers/{id}:
 *   get:
 *     summary: Get job seeker profile by ID
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the job seeker
 *     responses:
 *       200:
 *         description: Job seeker profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               data:
 *                 _id: "1234567890abcdef12345678"
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@example.com"
 *                 userType: "jobseeker"
 *                 profilePicture: "https://res.cloudinary.com/donozizpw/image/upload/v123456789/profile.jpg"
 *                 profile:
 *                   jobseeker:
 *                     bio: "Experienced software developer..."
 *                     cv: "https://res.cloudinary.com/donozizpw/image/upload/v123456789/cv.pdf"
 *                     yearsOfExperience: 7
 *                     skills: ["JavaScript", "Node.js"]
 *                     education:
 *                       - degree: "Bachelor of Science"
 *                         major: "Computer Science"
 *                         university: "Cairo University"
 *                         startDate: { month: "Sep", year: 2015 }
 *                         endDate: { month: "Jun", year: 2019 }
 *                 location:
 *                   country: "Egypt"
 *                   city: "Cairo"
 *                 createdAt: "2025-06-01T12:00:00Z"
 *                 updatedAt: "2025-06-27T19:00:00Z"
 *               message: "Job seeker profile retrieved successfully"
 *       400:
 *         description: Invalid job seeker ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *             example:
 *               success: false
 *               data: null
 *               message: "Invalid job seeker ID"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Job seeker not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *             example:
 *               success: false
 *               data: null
 *               message: "Job seeker not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.get("/job-seekers/:id", auth, getJobSeekerProfile);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.get("/:id", getJobById);

/**
 * @swagger
 * /jobs/{id}:
 *   put:
 *     summary: Update job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Job title
 *                 maxLength: 100
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Keywords or tags for the job
 *                 maxItems: 10
 *               jobRole:
 *                 type: string
 *                 enum: [Developer, Designer, Manager, Analyst, Engineer, Other]
 *                 description: Role of the job
 *               salary:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                     description: Minimum salary
 *                   max:
 *                     type: number
 *                     minimum: 0
 *                     description: Maximum salary
 *                   type:
 *                     type: string
 *                     enum: [hourly, monthly, yearly]
 *                     description: Salary type
 *               education:
 *                 type: string
 *                 enum: [High School, Bachelor, Master, PhD, Diploma, Other]
 *                 description: Required education level
 *               experience:
 *                 type: string
 *                 enum: [Entry Level, Mid Level, Senior Level, Executive]
 *                 description: Required experience level
 *               jobType:
 *                 type: string
 *                 enum: [full-time, part-time, remote, contract]
 *                 description: Type of job
 *               vacancies:
 *                 type: number
 *                 minimum: 1
 *                 description: Number of available vacancies
 *               expirationDate:
 *                 type: string
 *                 format: date-time
 *                 description: Job application deadline
 *               applyMethod:
 *                 type: string
 *                 enum: [external, email]
 *                 description: Method to apply for the job
 *               applyDetails:
 *                 type: string
 *                 description: URL or email for job application
 *               description:
 *                 type: string
 *                 description: Job description
 *                 maxLength: 2000
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of job responsibilities
 *                 minItems: 1
 *           example:
 *             title: "Lead Software Engineer"
 *             salary:
 *               max: 90000
 *             vacancies: 3
 *     responses:
 *       200:
 *         description: Job updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *             example:
 *               success: false
 *               data: null
 *               message: "Invalid job role"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.put("/:id", auth, restrictTo(["startup"]), updateJob);

/**
 * @swagger
 * /jobs/{id}:
 *   delete:
 *     summary: Delete job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Job not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: null
 *                 message:
 *                   type: string
 */
router.delete("/:id", auth, restrictTo(["startup"]), deleteJob);

module.exports = router;
