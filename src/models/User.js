const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Enable strict query mode to prevent undefined field queries
mongoose.set("strictQuery", true);

/**
 * @module models/User
 * @description Defines the User model with discriminators for jobseeker, investor, and startup types.
 * This model uses Mongoose discriminators to support polymorphic user types while sharing common fields.
 * Supports profile and cover picture uploads with Cloudinary integration.
 */

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      select: false,
      required: [
        function () {
          return this.userType !== "jobseeker" || !this.profile?.jobseeker?.cv;
        },
        "Password is required unless CV is provided for jobseekers",
      ],
      minlength: [6, "Password must be at least 6 characters"],
    },
    userType: {
      type: String,
      enum: {
        values: ["jobseeker", "investor", "startup", "admin"],
        message: "Invalid user type",
      },
      default: "jobseeker",
      index: true,
    },
    profilePicture: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+$/,
        "Please provide a valid URL for profile picture",
      ],
      default: null,
    },
    profilePicturePublicId: {
      type: String,
      trim: true,
      default: null,
    },
    coverPicture: {
      type: String,
      trim: true,
      match: [
        /^https?:\/\/.+$/,
        "Please provide a valid URL for cover picture",
      ],
      default: null,
    },
    coverPicturePublicId: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      // match: [/^\+?[1-9]\d{1,14}$/, "Please provide a valid phone number"],
      sparse: true,
    },
    birthdate: {
      type: {
        day: { type: Number, min: 1, max: 31 },
        month: {
          type: String,
          enum: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ],
        },
        year: {
          type: Number,
          min: 1900,
          max: new Date().getFullYear(),
          required: true,
        },
      },
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "preferNotToSay"],
      default: "preferNotToSay",
    },
    nationality: {
      type: String,
      trim: true,
      maxlength: [50, "Nationality cannot exceed 50 characters"],
    },
    location: {
      type: {
        country: {
          type: String,
          trim: true,
          maxlength: [50, "Country cannot exceed 50 characters"],
        },
        city: {
          type: String,
          trim: true,
          maxlength: [50, "City cannot exceed 50 characters"],
        },
        area: {
          type: String,
          trim: true,
          maxlength: [50, "Area cannot exceed 50 characters"],
        },
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
      index: true,
    },
    profile: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    nudgeLimit: {
      type: Number,
      default: function () {
        return this.userType === "startup" ? 10 : 0;
      },
      min: 0,
    },
    nudgeUsage: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    discriminatorKey: "userType",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for common queries
userSchema.index({ email: 1, userType: 1 });
userSchema.index({ "profile.startup.fundingGoal.amount": 1 });
userSchema.index({ "profile.startup.location.country": 1 });
userSchema.index({ "profile.startup.location.city": 1 });
userSchema.index({ "profile.startup.industry1": 1 });
userSchema.index({ "profile.startup.industry2": 1 });
userSchema.index({ "profile.startup.stage": 1 });

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware for password hashing and validation
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Jobseeker Schema
const jobseekerSchema = new mongoose.Schema({
  profile: {
    jobseeker: {
      bio: {
        type: String,
        trim: true,
        maxlength: [1000, "Bio cannot exceed 1000 characters"],
        default: null,
      },
      cv: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+$/, "Please provide a valid URL for CV"],
        default: null,
      },
      cvPublicId: {
        type: String,
        trim: true,
        default: null,
      },
      socialLinks: {
        facebook: {
          type: String,
          trim: true,
          // match: [
          //   /^https?:\/\/(www\.)?facebook\.com\/.+$/,
          //   "Please provide a valid Facebook URL",
          // ],
          default: null,
        },
        twitter: {
          type: String,
          trim: true,
          // match: [
          //   /^https?:\/\/(www\.)?x\.com\/.+$/,
          //   "Please provide a valid X URL",
          // ],
          default: null,
        },
        instagram: {
          type: String,
          trim: true,
          // match: [
          //   /^https?:\/\/(www\.)?instagram\.com\/.+$/,
          //   "Please provide a valid Instagram URL",
          // ],
          default: null,
        },
        linkedIn: {
          type: String,
          trim: true,
          // match: [
          //   /^https?:\/\/(www\.)?linkedin\.com\/.+$/,
          //   "Please provide a valid LinkedIn URL",
          // ],
          default: null,
        },
        reddit: {
          type: String,
          trim: true,
          // match: [
          //   /^https?:\/\/(www\.)?reddit\.com\/.+$/,
          //   "Please provide a valid Reddit URL",
          // ],
          default: null,
        },
        youtube: {
          type: String,
          trim: true,
          // match: [
          //   /^https?:\/\/(www\.)?youtube\.com\/.+$/,
          //   "Please provide a valid YouTube URL",
          // ],
          default: null,
        },
      },
      yearsOfExperience: { type: String },
      skills: { type: [String], trim: true, default: [] },
      education: [
        {
          degree: {
            type: String,
            trim: true,
            maxlength: [100, "Degree name cannot exceed 100 characters"],
            required: [true, "Degree name is required"],
          },
          major: {
            type: String,
            trim: true,
            maxlength: [100, "Major name cannot exceed 100 characters"],
            required: [true, "Major name is required"],
          },
          university: {
            type: String,
            trim: true,
            maxlength: [100, "University name cannot exceed 100 characters"],
            required: [true, "University name is required"],
          },
          startDate: {
            month: {
              type: String,
              enum: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
              required: [true, "Start month is required"],
            },
            year: {
              type: Number,
              min: 1900,
              max: new Date().getFullYear(),
              required: [true, "Start year is required"],
            },
          },
          endDate: {
            month: {
              type: String,
              enum: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
            },
            year: {
              type: Number,
              min: 1900,
              max: new Date().getFullYear() + 5,
            },
          },
          isCurrent: {
            type: Boolean,
            default: false,
          },
        },
      ],
      experiences: [
        {
          title: { type: String, trim: true },
          company: { type: String, trim: true },
          jobCategory: { type: String, trim: true },
          experienceType: {
            type: String,
            enum: [
              "Full Time",
              "Part Time",
              "Freelance",
              "Internship",
              "Volunteering",
              "Student Activities",
            ],
          },
          location: {
            country: { type: String, trim: true },
            city: { type: String, trim: true },
          },
          startDate: {
            month: {
              type: String,
              enum: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
            },
            year: {
              type: Number,
              min: 1900,
              max: new Date().getFullYear(),
            },
          },
          endDate: {
            month: {
              type: String,
              enum: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ],
            },
            year: {
              type: Number,
              min: 1900,
              max: new Date().getFullYear(),
            },
          },
          isCurrent: { type: Boolean, default: false },
          description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters"],
          },
        },
      ],
    },
  },
});

// Investor Schema
const investorSchema = new mongoose.Schema({
  profile: {
    investor: {
      bio: {
        type: String,
        trim: true,
        maxlength: [1000, "Bio cannot exceed 1000 characters"],
        required: function () {
          return this.bio !== undefined; // Required only if provided
        },
      },
      portfolio: [
        {
          company: { type: String, trim: true },
          amount: { type: Number, min: 0 },
          date: { type: Date },
        },
      ],
      linkedIn: {
        type: String,
        trim: true,
        match: [
          /^https?:\/\/(www\.)?linkedin\.com\/.+$/,
          "Please provide a valid LinkedIn URL",
        ],
      },
      twitter: {
        type: String,
        trim: true,
        match: [
          /^https?:\/\/(www\.)?twitter\.com\/.+$/,
          "Please provide a valid Twitter URL",
        ],
      },
      facebook: {
        type: String,
        trim: true,
        match: [
          /^https?:\/\/(www\.)?facebook\.com\/.+$/,
          "Please provide a valid Facebook URL",
        ],
      },
      website: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+$/, "Please provide a valid URL"],
      },
      investorType: {
        type: String,
        enum: ["Angel Investor", "Venture Capitalist", "Private Equity"],
      },
      areasOfExpertise: {
        type: [String],
      },
      numberOfPreviousInvestments: {
        type: Number,
        min: 0,
      },
      companies: [
        {
          name: { type: String, trim: true },
          amount: { type: Number, min: 0 },
        },
      ],
      investmentCriteria: {
        industries: {
          type: [
            {
              type: String,
              trim: true,
              enum: [
                "Agriculture",
                "Business Services",
                "Education & Training",
                "Energy & Natural Resources",
                "Entertainment & Leisure",
                "Fashion & Beauty",
                "Finance",
                "Food & Beverage",
                "Hospitality, Restaurants & Bars",
                "Manufacturing & Engineering",
                "Media",
                "Medical & Sciences",
                "Personal Services",
                "Products & Inventions",
                "Property",
                "Retail",
                "Sales & Marketing",
                "Software",
                "Technology",
                "Transportation",
              ],
            },
          ],
        },
        locations: [
          {
            country: { type: String, trim: true },
            city: { type: String, trim: true },
          },
        ],
        investmentRange: {
          min: { type: Number, min: 0 },
          max: {
            type: Number,
            min: 0,
          },
        },
        stage: {
          type: [
            {
              type: String,
              trim: true,
              // enum: [
              //   "Achieving Sales",
              //   "Breaking Even",
              //   "MVP/Finished Product",
              //   "Pre-Startup/R&D",
              //   "Profitable",
              // ],
            },
          ],
        },
      },
    },
  },
});

function arrayLimit(limit) {
  return (val) => val.length === limit;
}

// Startup Schema
const startupSchema = new mongoose.Schema({
  profile: {
    startup: {
      pitchTitle: {
        type: String,
        trim: true,
        maxlength: [100, "Pitch title cannot exceed 100 characters"],
      },
      website: {
        type: String,
        trim: true,
        default: null,
      },
      mobileNumber: {
        type: String,
        trim: true,
        match: [/^\+?[1-9]\d{1,14}$/, "Please provide a valid mobile number"],
        default: null,
      },
      industry1: { type: String, trim: true },
      industry2: { type: String, trim: true, default: null },
      location: {
        country: { type: String, trim: true },
        city: { type: String, trim: true },
      },
      description: {
        type: String,
        trim: true,
        maxlength: [1000, "Description cannot exceed 1000 characters"],
      },
      fundingGoal: {
        amount: { type: Number, min: 0 },
        currency: { type: String, default: "USD", enum: ["USD", "EUR", "GBP"] },
      },
      amountRaised: { type: Number, min: 0, default: 0 },
      minInvestmentPerInvestor: { type: Number, min: 0 },
      stage: {
        type: String,
        enum: ["idea", "prototype", "mvp", "scaling"],
        required: true,
      },
      idealInvestorRole: {
        type: String,
        enum: ["strategic", "financial", "mentor", "networker"],
        required: true,
      },
      previousFunding: { type: Number, min: 0, default: 0 },
      team: [
        {
          name: {
            type: String,
            trim: true,
            required: [true, "Team member name is required"],
            maxlength: [100, "Team member name cannot exceed 100 characters"],
          },
          role: {
            type: String,
            trim: true,
            required: [true, "Team member role is required"],
            maxlength: [100, "Team member role cannot exceed 100 characters"],
          },
        },
      ],
      pitchDeck: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+$/, "Please provide a valid URL for pitch deck"],
      },
      successPrediction: {
        score: { type: Number, min: 0, max: 100, default: null },
        details: { type: String, trim: true, default: null },
      },
    },
  },
});

const User = mongoose.model("User", userSchema);
const Jobseeker = mongoose.model("Jobseeker", jobseekerSchema, "users");
const Investor = mongoose.model("Investor", investorSchema, "users");
const Startup = mongoose.model("Startup", startupSchema, "users");

module.exports = { User, Jobseeker, Investor, Startup };
