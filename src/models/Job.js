const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [100, "Job title cannot exceed 100 characters"],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags) => tags.length <= 10,
        message: "Maximum 10 tags are allowed",
      },
    },
    jobRole: {
      type: String,
      required: [true, "Job role is required"],
      enum: [
        "softwareEngineer",
        "productManager",
        "designer",
        "dataAnalyst",
        "marketingSpecialist",
        "other",
      ],
      trim: true,
    },
    salary: {
      min: {
        type: Number,
        required: [true, "Minimum salary is required"],
        min: [0, "Minimum salary cannot be negative"],
      },
      max: {
        type: Number,
        required: [true, "Maximum salary is required"],
        min: [0, "Maximum salary cannot be negative"],
        validate: {
          validator: function (value) {
            return value >= this.salary.min;
          },
          message:
            "Maximum salary must be greater than or equal to minimum salary",
        },
      },
      type: {
        type: String,
        required: [true, "Salary type is required"],
        enum: ["hourly", "monthly", "yearly"],
      },
    },
    education: {
      type: String,
      required: [true, "Education level is required"],
      enum: ["highSchool", "bachelor", "master", "phd", "diploma", "other"],
    },
    jobLevel: {
      type: String,
      required: [true, "Job level is required"],
      enum: ["0-1", "1-3", "3-5", "5+"],
    },
    experience: {
      type: String,
      required: [true, "Experience level is required"],
      enum: ["entryLevel", "midLevel", "seniorLevel", "executive"],
    },
    jobType: {
      type: String,
      required: [true, "Job type is required"],
      enum: ["fullTime", "partTime", "remote", "contract"],
    },
    vacancies: {
      type: Number,
      required: [true, "Number of vacancies is required"],
      min: [1, "At least one vacancy is required"],
    },
    expirationDate: {
      type: Date,
      required: [true, "Expiration date is required"],
      validate: {
        validator: (date) => date > new Date(),
        message: "Expiration date must be in the future",
      },
    },
    applyMethod: {
      type: String,
      required: [true, "Apply method is required"],
      enum: ["external", "email"],
    },
    applyDetails: {
      type: String,
      required: [true, "Apply details are required"],
      validate: {
        validator: function (value) {
          if (this.applyMethod === "external") {
            return /^https?:\/\/.+$/.test(value); // URL validation
          }
          if (this.applyMethod === "email") {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); // Email validation
          }
          return true;
        },
        message: "Invalid apply method details (URL or email required)",
      },
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    responsibilities: {
      type: [String],
      required: [true, "At least one responsibility is required"],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one responsibility is required",
      },
    },
    startupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Startup ID is required"],
    },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
    applications: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Application" }],
      default: [],
    },
    applicationCount: {
      type: Number,
      default: 0,
      min: [0, "Application count cannot be negative"],
    },
  },
  { timestamps: true }
);

// Text index for search
jobSchema.index({ title: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Job", jobSchema);
