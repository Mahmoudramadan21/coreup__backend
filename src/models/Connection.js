const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
    },
    nudge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Nudge",
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
  }
);

connectionSchema.index({ sender: 1, receiver: 1 }, { unique: true });

connectionSchema.pre("save", function (next) {
  if (this.sender.equals(this.receiver)) {
    return next(new Error("Cannot send connection to yourself"));
  }
  next();
});

module.exports = mongoose.model("Connection", connectionSchema);
