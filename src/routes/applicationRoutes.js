const express = require("express");
const { auth, restrictTo } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const {
  applyForJob,
  getJobApplications,
  updateApplicationStatus,
  deleteApplication,
  getApplicationById,
  hireApplicant,
} = require("../controllers/applicationController");

const router = express.Router();

/**
 * @swagger
 * /applications/{jobId}/apply:
 *   post:
 *     summary: Apply for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the job to apply for
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [cv]
 *             properties:
 *               coverLetter:
 *                 type: string
 *                 description: Optional cover letter for the application
 *               cv:
 *                 type: string
 *                 format: binary
 *                 description: Resume/CV file (PDF, jpg, jpeg, png)
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *             example:
 *               _id: "1234567890abcdef12345678"
 *               jobId: "abcdef1234567890abcdef12"
 *               userId: "user1234567890abcdef1234"
 *               startupId: "startup1234567890abcdef12"
 *               cv: "https://res.cloudinary.com/donozizpw/raw/upload/v1234567890/cvs/resume.pdf"
 *               cvPublicId: "cvs/resume_1234567890"
 *               coverLetter: "I am excited to apply for this position..."
 *               status: "pending"
 *               createdAt: "2025-06-27T00:42:00.000Z"
 *               updatedAt: "2025-06-27T00:42:00.000Z"
 *       400:
 *         description: CV required or already applied
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
 *               message: "CV is required"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Must be a jobseeker
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
 *               message: "Unauthorized: Must be a jobseeker"
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
router.post(
  "/:jobId/apply",
  auth,
  restrictTo(["jobseeker"]),
  upload.single("cv"),
  applyForJob
);

/**
 * @swagger
 * /applications/{id}/hire:
 *   put:
 *     summary: Hire an applicant for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the application
 *     responses:
 *       200:
 *         description: Applicant hired successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Application'
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid application ID or no vacancies
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
 *       403:
 *         description: Unauthorized
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
 *       404:
 *         description: Application not found
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
router.put("/:id/hire", auth, restrictTo(["startup"]), hireApplicant);

/**
 * @swagger
 * /applications/job/{jobId}:
 *   get:
 *     summary: Get applications for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the job
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sort applications by creation date (newest or oldest)
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
 *           maximum: 100
 *           default: 10
 *         description: Number of applications per page
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
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
 *                     applications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             description: Application ID
 *                           jobId:
 *                             type: string
 *                             description: ID of the job
 *                           userId:
 *                             type: object
 *                             properties:
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               profile:
 *                                 type: object
 *                                 properties:
 *                                   jobseeker:
 *                                     type: object
 *                                     properties:
 *                                       skills:
 *                                         type: array
 *                                         items:
 *                                           type: string
 *                                       education:
 *                                         type: array
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             degree:
 *                                               type: string
 *                                             major:
 *                                               type: string
 *                                             university:
 *                                               type: string
 *                                             startDate:
 *                                               type: object
 *                                               properties:
 *                                                 month:
 *                                                   type: string
 *                                                 year:
 *                                                   type: number
 *                                             endDate:
 *                                               type: object
 *                                               properties:
 *                                                 month:
 *                                                   type: string
 *                                                 year:
 *                                                   type: number
 *                                               nullable: true
 *                                             isCurrent:
 *                                               type: boolean
 *                                       experiences:
 *                                         type: array
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             title:
 *                                               type: string
 *                                             company:
 *                                               type: string
 *                                             jobCategory:
 *                                               type: string
 *                                             experienceType:
 *                                               type: string
 *                                             location:
 *                                               type: object
 *                                               properties:
 *                                                 country:
 *                                                   type: string
 *                                                 city:
 *                                                   type: string
 *                                             startDate:
 *                                               type: object
 *                                               properties:
 *                                                 month:
 *                                                   type: string
 *                                                 year:
 *                                                   type: number
 *                                             endDate:
 *                                               type: object
 *                                               properties:
 *                                                 month:
 *                                                   type: string
 *                                                 year:
 *                                                   type: number
 *                                               nullable: true
 *                                             isCurrent:
 *                                               type: boolean
 *                                             description:
 *                                               type: string
 *                                       yearsOfExperience:
 *                                         type: number
 *                           cv:
 *                             type: string
 *                           cvPublicId:
 *                             type: string
 *                           coverLetter:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [pending, accepted, rejected]
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               data:
 *                 applications:
 *                   - _id: "1234567890abcdef12345678"
 *                     jobId: "abcdef1234567890abcdef12"
 *                     userId:
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                       email: "john.doe@example.com"
 *                       profile:
 *                         jobseeker:
 *                           skills: ["JavaScript", "React", "Node.js"]
 *                           education:
 *                             - degree: "Bachelor of Science"
 *                               major: "Computer Science"
 *                               university: "Cairo University"
 *                               startDate:
 *                                 month: "Sep"
 *                                 year: 2018
 *                               endDate:
 *                                 month: "Jun"
 *                                 year: 2022
 *                               isCurrent: false
 *                             - degree: "Master of Science"
 *                               major: "Software Engineering"
 *                               university: "AUC"
 *                               startDate:
 *                                 month: "Sep"
 *                                 year: 2022
 *                               isCurrent: true
 *                           experiences:
 *                             - title: "Software Engineer"
 *                               company: "Tech Corp"
 *                               jobCategory: "Engineering"
 *                               experienceType: "Full Time"
 *                               location:
 *                                 country: "Egypt"
 *                                 city: "Cairo"
 *                               startDate:
 *                                 month: "Jul"
 *                                 year: 2022
 *                               endDate:
 *                                 month: "Jun"
 *                                 year: 2023
 *                               isCurrent: false
 *                               description: "Developed web applications using React and Node.js"
 *                             - title: "Freelance Developer"
 *                               company: "Self-Employed"
 *                               jobCategory: "Engineering"
 *                               experienceType: "Freelance"
 *                               location:
 *                                 country: "Egypt"
 *                                 city: "Cairo"
 *                               startDate:
 *                                 month: "Jul"
 *                                 year: 2023
 *                               isCurrent: true
 *                               description: "Built custom websites for clients"
 *                           yearsOfExperience: 3
 *                     cv: "https://res.cloudinary.com/donozizpw/raw/upload/v1234567890/cvs/resume.pdf"
 *                     cvPublicId: "cvs/resume_1234567890"
 *                     coverLetter: "I am excited to apply for this position..."
 *                     status: "pending"
 *                     createdAt: "2025-06-27T00:42:00.000Z"
 *                 pagination:
 *                   total: 25
 *                   page: 1
 *                   limit: 10
 *                   totalPages: 3
 *               message: "Applications retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Job not found or unauthorized
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
 *               message: "Job not found or unauthorized"
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
router.get("/job/:jobId", auth, restrictTo(["startup"]), getJobApplications);

/**
 * @swagger
 * /applications/{id}:
 *   get:
 *     summary: Get application by ID
 *     description: Retrieves a single application with full details of the application and jobseeker. Accessible only by the startup that owns the job.
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application retrieved successfully
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
 *                     _id:
 *                       type: string
 *                       description: Application ID
 *                     jobId:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         jobRole:
 *                           type: string
 *                         salary:
 *                           type: object
 *                           properties:
 *                             min:
 *                               type: number
 *                             max:
 *                               type: number
 *                             type:
 *                               type: string
 *                               enum: [hourly, monthly, yearly]
 *                         education:
 *                           type: string
 *                         experience:
 *                           type: string
 *                         jobType:
 *                           type: string
 *                         vacancies:
 *                           type: number
 *                         expirationDate:
 *                           type: string
 *                           format: date-time
 *                         applyMethod:
 *                           type: string
 *                         applyDetails:
 *                           type: string
 *                         description:
 *                           type: string
 *                         responsibilities:
 *                           type: array
 *                           items:
 *                             type: string
 *                     userId:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         email:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         nationality:
 *                           type: string
 *                         birthdate:
 *                           type: object
 *                           properties:
 *                             day:
 *                               type: number
 *                             month:
 *                               type: string
 *                             year:
 *                               type: number
 *                         gender:
 *                           type: string
 *                         location:
 *                           type: object
 *                           properties:
 *                             country:
 *                               type: string
 *                             city:
 *                               type: string
 *                             area:
 *                               type: string
 *                         profile:
 *                           type: object
 *                           properties:
 *                             jobseeker:
 *                               type: object
 *                               properties:
 *                                 skills:
 *                                   type: array
 *                                   items:
 *                                     type: string
 *                                 education:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       degree:
 *                                         type: string
 *                                       major:
 *                                         type: string
 *                                       university:
 *                                         type: string
 *                                       startDate:
 *                                         type: object
 *                                         properties:
 *                                           month:
 *                                             type: string
 *                                           year:
 *                                             type: number
 *                                       endDate:
 *                                         type: object
 *                                         properties:
 *                                           month:
 *                                             type: string
 *                                           year:
 *                                             type: number
 *                                         nullable: true
 *                                       isCurrent:
 *                                         type: boolean
 *                                 experiences:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       title:
 *                                         type: string
 *                                       company:
 *                                         type: string
 *                                       jobCategory:
 *                                         type: string
 *                                       experienceType:
 *                                         type: string
 *                                       location:
 *                                         type: object
 *                                         properties:
 *                                           country:
 *                                             type: string
 *                                           city:
 *                                             type: string
 *                                       startDate:
 *                                         type: object
 *                                         properties:
 *                                           month:
 *                                             type: string
 *                                           year:
 *                                             type: number
 *                                       endDate:
 *                                         type: object
 *                                         properties:
 *                                           month:
 *                                             type: string
 *                                           year:
 *                                             type: number
 *                                         nullable: true
 *                                       isCurrent:
 *                                         type: boolean
 *                                       description:
 *                                         type: string
 *                                 yearsOfExperience:
 *                                   type: number
 *                     startupId:
 *                       type: string
 *                     cv:
 *                       type: string
 *                     cvPublicId:
 *                       type: string
 *                       nullable: true
 *                     coverLetter:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, accepted, rejected]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               data:
 *                 _id: "1234567890abcdef12345678"
 *                 jobId:
 *                   _id: "abcdef1234567890abcdef12"
 *                   title: "Full Stack Developer"
 *                   jobRole: "Developer"
 *                   salary:
 *                     min: 50000
 *                     max: 80000
 *                     type: "yearly"
 *                   education: "Bachelor"
 *                   experience: "Mid Level"
 *                   jobType: "remote"
 *                   vacancies: 2
 *                   expirationDate: "2025-12-31T00:00:00.000Z"
 *                   applyMethod: "email"
 *                   applyDetails: "hr@startup.com"
 *                   description: "Develop web applications..."
 *                   responsibilities: ["Build APIs", "Maintain codebase"]
 *                 userId:
 *                   _id: "user1234567890abcdef1234"
 *                   firstName: "Ahmed"
 *                   lastName: "Mohamed"
 *                   email: "ahmed.mohamed@example.com"
 *                   phone: "+201234567890"
 *                   nationality: "Egyptian"
 *                   birthdate:
 *                     day: 15
 *                     month: "Jun"
 *                     year: 1995
 *                   gender: "male"
 *                   location:
 *                     country: "Egypt"
 *                     city: "Cairo"
 *                     area: "Nasr City"
 *                   profile:
 *                     jobseeker:
 *                       skills: ["JavaScript", "Node.js", "MongoDB"]
 *                       education:
 *                         - degree: "Bachelor of Science"
 *                           major: "Computer Science"
 *                           university: "University of Cairo"
 *                           startDate:
 *                             month: "Sep"
 *                             year: 2015
 *                           endDate:
 *                             month: "May"
 *                             year: 2019
 *                           isCurrent: false
 *                       experiences:
 *                         - title: "Full Stack Developer"
 *                           company: "TechCorp"
 *                           jobCategory: "IT"
 *                           experienceType: "Full Time"
 *                           location:
 *                             country: "Egypt"
 *                             city: "Cairo"
 *                           startDate:
 *                             month: "Jan"
 *                             year: 2020
 *                           endDate:
 *                             month: "Jun"
 *                             year: 2025
 *                           isCurrent: true
 *                           description: "Developed web applications..."
 *                       yearsOfExperience: 5
 *                 startupId: "startup1234567890abcdef12"
 *                 cv: "https://res.cloudinary.com/donozizpw/raw/upload/v1234567890/cvs/ahmed_cv.pdf"
 *                 cvPublicId: "cvs/ahmed_cv_1234567890"
 *                 coverLetter: "I am excited to apply for this position..."
 *                 status: "pending"
 *                 createdAt: "2025-06-27T15:38:00.000Z"
 *                 updatedAt: "2025-06-27T15:38:00.000Z"
 *               message: "Application retrieved successfully"
 *       403:
 *         description: Unauthorized access
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
 *               message: "Unauthorized: You do not own this job"
 *       404:
 *         description: Application not found
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
 *               message: "Application not found"
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
 *             example:
 *               success: false
 *               data: null
 *               message: "Server error: <error message>"
 */
router.get("/:id", auth, restrictTo(["startup"]), getApplicationById);

/**
 * @swagger
 * /applications/{id}:
 *   put:
 *     summary: Update application status
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the application
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, rejected]
 *                 description: New status of the application
 *             example:
 *               status: "accepted"
 *     responses:
 *       200:
 *         description: Application status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *             example:
 *               _id: "1234567890abcdef12345678"
 *               jobId: "abcdef1234567890abcdef12"
 *               userId: "user1234567890abcdef1234"
 *               startupId: "startup1234567890abcdef12"
 *               cv: "https://res.cloudinary.com/donozizpw/raw/upload/v1234567890/cvs/resume.pdf"
 *               cvPublicId: "cvs/resume_1234567890"
 *               coverLetter: "I am excited to apply for this position..."
 *               status: "accepted"
 *               createdAt: "2025-06-27T00:42:00.000Z"
 *               updatedAt: "2025-06-27T01:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Unauthorized
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
 *               message: "Unauthorized"
 *       404:
 *         description: Application not found
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
 *               message: "Application not found"
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
router.put("/:id", auth, restrictTo(["startup"]), updateApplicationStatus);

/**
 * @swagger
 * /applications/{id}:
 *   delete:
 *     summary: Delete an application
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the application to delete
 *     responses:
 *       200:
 *         description: Application deleted successfully
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
 *               success: true
 *               data: null
 *               message: "Application deleted successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Application not found or unauthorized
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
 *               message: "Application not found or unauthorized"
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
router.delete("/:id", auth, restrictTo(["startup"]), deleteApplication);

/**
 * @swagger
 * components:
 *   schemas:
 *     Application:
 *       type: object
 *       required:
 *         - jobId
 *         - userId
 *         - startupId
 *         - cv
 *       properties:
 *         jobId:
 *           type: string
 *           description: ID of the job
 *         userId:
 *           type: string
 *           description: ID of the jobseeker
 *         startupId:
 *           type: string
 *           description: ID of the startup
 *         cv:
 *           type: string
 *           description: Cloudinary URL of the uploaded CV
 *         cvPublicId:
 *           type: string
 *           description: Cloudinary public_id of the CV
 *           nullable: true
 *         coverLetter:
 *           type: string
 *           description: Optional cover letter
 *         status:
 *           type: string
 *           enum: [pending, accepted, rejected]
 *           description: Status of the application
 *           default: pending
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Application creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Application last updated date
 *   responses:
 *     UnauthorizedError:
 *       description: Unauthorized
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success:
 *                 type: boolean
 *               data:
 *                 type: null
 *               message:
 *                 type: string
 *             example:
 *               success: false
 *               data: null
 *               message: "Unauthorized: No token provided"
 */

module.exports = router;
