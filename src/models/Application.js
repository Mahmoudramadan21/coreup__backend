const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary");

/**
 * Application Schema for job applications
 * @module models/Application
 */
const applicationSchema = new mongoose.Schema(
  {
    /**
     * ID of the job being applied to
     */
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    /**
     * ID of the user applying (jobseeker)
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    /**
     * ID of the startup posting the job
     */
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Startup ID is required"],
    },
    /**
     * URL of the applicant's CV (Cloudinary URL)
     */
    cv: {
      type: String,
      required: [true, "CV is required"],
      trim: true,
    },
    /**
     * Cloudinary public_id for the CV
     */
    cvPublicId: {
      type: String,
      required: false, // Optional for backward compatibility
      trim: true,
    },
    /**
     * Applicant's cover letter
     */
    coverLetter: {
      type: String,
      trim: true,
    },
    /**
     * Application status (pending, accepted, rejected)
     */
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

/**
 * Pre-remove middleware to update Job model and delete CV from Cloudinary
 */
applicationSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      // Load Job model dynamically to avoid schema registration issues
      let Job;
      try {
        Job = mongoose.models.Job || require("./Job");
      } catch (error) {
        return next(new Error("Job model not found"));
      }

      // Update Job model: remove application ID and decrement applicationCount
      await Job.updateOne(
        { _id: this.jobId },
        {
          $pull: { applications: this._id },
          $inc: { applicationCount: -1 },
        }
      );

      // Delete CV from Cloudinary
      if (this.cvPublicId) {
        await cloudinary.uploader
          .destroy(this.cvPublicId, {
            resource_type: "raw",
          })
          .catch((err) => {
            console.warn(`Failed to delete CV from Cloudinary: ${err.message}`);
          });
      }

      next();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Indexes for performance
 */
applicationSchema.index({ jobId: 1, userId: 1 });
applicationSchema.index({ startupId: 1 });

module.exports = mongoose.model("Application", applicationSchema);
