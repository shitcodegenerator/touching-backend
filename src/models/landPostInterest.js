const mongoose = require("mongoose");

const landPostInterestSchema = new mongoose.Schema(
  {
    landPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LandPost",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "member",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 30,
    },
    phone: {
      type: String,
      default: "",
      maxlength: 20,
    },
    lineId: {
      type: String,
      default: "",
      maxlength: 30,
    },
    message: {
      type: String,
      required: true,
      maxlength: 200,
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
    emailError: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// 同一用戶對同一案件僅能申請一次
landPostInterestSchema.index({ userId: 1, landPostId: 1 }, { unique: true });

module.exports = mongoose.model("LandPostInterest", landPostInterestSchema);
