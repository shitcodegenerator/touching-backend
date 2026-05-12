const mongoose = require("mongoose");

const landPostSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "member",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "sell",
        "rent",
        "buy",
        "joint_development",
        "asset_lease",
        "other",
      ],
      required: true,
    },
    contactName: {
      type: String,
      required: true,
      maxlength: 15,
    },
    city: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    section: {
      type: String,
    },
    landNumbers: {
      type: [String],
      validate: {
        validator: (val) => val.length <= 20,
        message: "地號最多 20 筆",
      },
    },
    approximateLocation: {
      type: String,
      maxlength: 50,
    },
    landArea: {
      type: Number,
      min: 0,
    },
    landAreaUnit: {
      type: String,
      enum: ["ping", "sqm", "hectare"],
    },
    landCondition: {
      type: String,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 200,
    },
    priceBudget: {
      type: String,
      maxlength: 20,
    },
    visibility: {
      type: String,
      enum: ["platform_public", "internal_only"],
      required: true,
    },
    images: {
      type: [
        {
          key: { type: String },
          url: { type: String },
        },
      ],
      validate: {
        validator: (val) => val.length <= 5,
        message: "圖片最多 5 張",
      },
    },
    contactPhone: {
      type: String,
      maxlength: 20,
    },
    contactLine: {
      type: String,
      maxlength: 20,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewNote: {
      type: String,
    },
    publicSlug: {
      type: String,
      unique: true,
      sparse: true,
    },
    publicTitle: {
      type: String,
    },
    version: {
      type: Number,
      default: 1,
    },
    agreedToTerms: {
      type: Boolean,
      required: true,
    },
    lastEditedAt: {
      type: Date,
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  { timestamps: true },
);

// Compound indexes
landPostSchema.index({ userId: 1, createdAt: -1 });
landPostSchema.index({ status: 1, visibility: 1, createdAt: -1 });
landPostSchema.index({ publicSlug: 1 }, { unique: true, sparse: true });
landPostSchema.index({ userId: 1, createdAt: 1 });
landPostSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("LandPost", landPostSchema);
