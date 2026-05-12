const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");
const LandPost = require("../models/landPost.js");
const {
  generatePresignedUploadUrl,
  deleteObjects,
} = require("../utils/r2Client.js");
const { sendSuccess, sendError } = require("../utils/response.js");

// XSS sanitize helper — 移除危險字元，不做 HTML entity encode（避免存入 DB 後被前端雙重 escape）
const sanitizeText = (text) => {
  if (!text) return text;
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
};

// Joi validation schemas
const createLandPostSchema = Joi.object({
  type: Joi.string()
    .valid("sell", "rent", "buy", "joint_development", "asset_lease", "other")
    .required()
    .messages({
      "any.only": "類型不正確",
      "any.required": "類型為必填",
    }),
  contactName: Joi.string().trim().max(15).required().messages({
    "string.max": "聯絡人姓名不能超過 15 字元",
    "any.required": "聯絡人姓名為必填",
  }),
  city: Joi.string().trim().required().messages({
    "any.required": "縣市為必填",
  }),
  district: Joi.string().trim().required().messages({
    "any.required": "區域為必填",
  }),
  section: Joi.string().trim().allow("").optional(),
  landNumbers: Joi.array()
    .items(Joi.string().trim().max(30))
    .max(20)
    .optional()
    .messages({
      "array.max": "地號最多 20 筆",
    }),
  approximateLocation: Joi.string()
    .trim()
    .max(50)
    .allow("")
    .optional()
    .messages({
      "string.max": "概略位置不能超過 50 字元",
    }),
  landArea: Joi.number().min(0).optional().messages({
    "number.min": "土地面積不能為負數",
  }),
  landAreaUnit: Joi.string()
    .valid("ping", "sqm", "hectare")
    .optional()
    .messages({
      "any.only": "面積單位不正確",
    }),
  landCondition: Joi.string().trim().max(200).allow("").optional().messages({
    "string.max": "土地現況不能超過 200 字元",
  }),
  description: Joi.string().trim().max(200).required().messages({
    "string.max": "說明不能超過 200 字元",
    "any.required": "說明為必填",
  }),
  priceBudget: Joi.string().trim().max(20).allow("").optional().messages({
    "string.max": "價格預算不能超過 20 字元",
  }),
  visibility: Joi.string()
    .valid("platform_public", "internal_only")
    .required()
    .messages({
      "any.only": "公開範圍不正確",
      "any.required": "公開範圍為必填",
    }),
  images: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().max(200).required(),
        url: Joi.string()
          .uri({ scheme: ["https"] })
          .max(500)
          .required(),
      }),
    )
    .max(5)
    .optional()
    .messages({
      "array.max": "圖片最多 5 張",
    }),
  contactPhone: Joi.string().trim().max(20).allow("").optional().messages({
    "string.max": "聯絡電話不能超過 20 碼",
  }),
  contactLine: Joi.string().trim().max(20).allow("").optional().messages({
    "string.max": "Line ID 不能超過 20 碼",
  }),
  agreedToTerms: Joi.boolean().required().messages({
    "any.required": "請同意投稿條款",
  }),
  idempotencyKey: Joi.string().trim().optional(),
});

const updateLandPostSchema = Joi.object({
  type: Joi.string()
    .valid("sell", "rent", "buy", "joint_development", "asset_lease", "other")
    .optional(),
  contactName: Joi.string().trim().max(15).optional(),
  city: Joi.string().trim().optional(),
  district: Joi.string().trim().optional(),
  section: Joi.string().trim().allow("").optional(),
  landNumbers: Joi.array()
    .items(Joi.string().trim().max(30))
    .max(20)
    .optional(),
  approximateLocation: Joi.string().trim().max(50).allow("").optional(),
  landArea: Joi.number().min(0).optional(),
  landAreaUnit: Joi.string().valid("ping", "sqm", "hectare").optional(),
  landCondition: Joi.string().trim().max(200).allow("").optional(),
  description: Joi.string().trim().max(200).optional(),
  priceBudget: Joi.string().trim().max(20).allow("").optional(),
  visibility: Joi.string().valid("platform_public", "internal_only").optional(),
  images: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().max(200).required(),
        url: Joi.string()
          .uri({ scheme: ["https"] })
          .max(500)
          .required(),
      }),
    )
    .max(5)
    .optional(),
  contactPhone: Joi.string().trim().max(20).allow("").optional(),
  contactLine: Joi.string().trim().max(20).allow("").optional(),
  version: Joi.number().required().messages({
    "any.required": "版本號為必填",
  }),
});

// Sanitize all text fields in body
const sanitizeBody = (body) => {
  const sanitized = { ...body };
  const textFields = [
    "contactName",
    "city",
    "district",
    "section",
    "approximateLocation",
    "description",
    "landCondition",
    "priceBudget",
    "contactPhone",
    "contactLine",
  ];
  for (const field of textFields) {
    if (sanitized[field]) {
      sanitized[field] = sanitizeText(sanitized[field]);
    }
  }
  if (sanitized.landNumbers) {
    sanitized.landNumbers = sanitized.landNumbers.map((n) => sanitizeText(n));
  }
  return sanitized;
};

/**
 * 產生圖片上傳預簽名 URL
 */
const generateUploadUrl = async (req, res) => {
  const { contentType } = req.body;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!contentType || !allowedTypes.includes(contentType)) {
    return sendError(res, "僅支援 JPEG、PNG、WebP 格式圖片", 400);
  }

  const extMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extMap[contentType];
  const userId = req.userData.userId;
  const key = `land-posts/${userId}/${Date.now()}-${uuidv4()}.${ext}`;

  const url = await generatePresignedUploadUrl(key, contentType);
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

  return sendSuccess(res, { url, key, publicUrl });
};

/**
 * 建立土地投稿
 */
const createLandPost = async (req, res) => {
  const { error, value } = createLandPostSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message).join("; ");
    return sendError(res, messages, 400);
  }

  if (value.agreedToTerms !== true) {
    return sendError(res, "請先同意投稿條款", 400);
  }

  const userId = req.userData.userId;

  // Daily limit check
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayCount = await LandPost.countDocuments({
    userId,
    createdAt: { $gte: todayStart },
  });

  if (todayCount >= 5) {
    return sendError(res, "每日投稿上限為 5 筆，請明日再試", 429);
  }

  // Idempotency check
  if (value.idempotencyKey) {
    const existing = await LandPost.findOne({
      idempotencyKey: value.idempotencyKey,
    });
    if (existing) {
      return sendSuccess(res, existing, 200);
    }
  }

  const sanitized = sanitizeBody(value);

  const post = await LandPost.create({
    ...sanitized,
    userId,
    status: "pending",
    version: 1,
  });

  return sendSuccess(res, post, 201);
};

/**
 * 取得我的投稿列表
 */
const getMyLandPosts = async (req, res) => {
  const userId = req.userData.userId;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    LandPost.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    LandPost.countDocuments({ userId }),
  ]);

  return sendSuccess(res, posts, 200, { total, page, limit });
};

/**
 * 取得單筆投稿（雙模式：擁有者 / 公開）
 */
const getLandPost = async (req, res) => {
  const { id } = req.params;
  const post = await LandPost.findById(id);

  if (!post) {
    return sendError(res, "找不到該案件", 404);
  }

  // Check if requester is the owner
  const isOwner =
    req.userData && req.userData.userId === post.userId.toString();

  if (isOwner) {
    return sendSuccess(res, post);
  }

  // Public access: must be approved and platform_public
  if (post.status !== "approved" || post.visibility !== "platform_public") {
    return sendError(res, "找不到該案件", 404);
  }

  const postObj = post.toObject();

  // 公開模式不顯示個人聯絡資訊，聯絡人姓名隱碼
  delete postObj.contactPhone;
  delete postObj.contactLine;
  if (postObj.contactName && postObj.contactName.length > 1) {
    postObj.contactName =
      postObj.contactName[0] + "*".repeat(postObj.contactName.length - 1);
  }

  return sendSuccess(res, postObj);
};

/**
 * 更新投稿
 */
const updateLandPost = async (req, res) => {
  const { id } = req.params;
  const userId = req.userData.userId;

  const { error, value } = updateLandPostSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message).join("; ");
    return sendError(res, messages, 400);
  }

  const post = await LandPost.findOne({ _id: id, userId });

  if (!post) {
    return sendError(res, "找不到該案件", 404);
  }

  if (post.status !== "pending") {
    return sendError(res, "案件已送審，無法編輯", 400);
  }

  if (value.version !== post.version) {
    return sendError(res, "資料已被更新，請重新載入後再編輯", 409);
  }

  const { version, ...updateFields } = value;
  const sanitized = sanitizeBody(updateFields);

  const updated = await LandPost.findByIdAndUpdate(
    id,
    {
      ...sanitized,
      $inc: { version: 1 },
      lastEditedAt: new Date(),
    },
    { new: true },
  );

  return sendSuccess(res, updated);
};

/**
 * 刪除投稿
 */
const deleteLandPost = async (req, res) => {
  const { id } = req.params;
  const userId = req.userData.userId;

  const result = await LandPost.findOneAndDelete({
    _id: id,
    userId,
    status: "pending",
  });

  if (!result) {
    return sendError(res, "找不到該案件或案件已送審無法刪除", 404);
  }

  // 刪除 R2 圖片
  const keys = (result.images || []).map((img) => img.key).filter(Boolean);
  if (keys.length > 0) {
    deleteObjects(keys).catch(() => {});
  }

  return sendSuccess(res, null, 200, null, "已成功刪除");
};

/**
 * 取得公開投稿列表
 */
const getPublicLandPosts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const query = {
    status: "approved",
    visibility: "platform_public",
  };

  const [posts, total] = await Promise.all([
    LandPost.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    LandPost.countDocuments(query),
  ]);

  // 公開列表不顯示個人聯絡資訊，聯絡人姓名隱碼
  const filteredPosts = posts.map((post) => {
    const postObj = post.toObject();
    delete postObj.contactPhone;
    delete postObj.contactLine;
    if (postObj.contactName && postObj.contactName.length > 1) {
      postObj.contactName =
        postObj.contactName[0] + "*".repeat(postObj.contactName.length - 1);
    }
    return postObj;
  });

  return sendSuccess(res, filteredPosts, 200, { total, page, limit });
};

/**
 * [Admin] 列出所有土地投稿（支援狀態篩選、分頁）
 */
const adminListLandPosts = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const status = req.query.status; // pending, approved, rejected, or undefined for all

  const filter = {};
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    filter.status = status;
  }

  const [posts, total] = await Promise.all([
    LandPost.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LandPost.countDocuments(filter),
  ]);

  return sendSuccess(res, posts, 200, { total, page, limit });
};

/**
 * [Admin] 核准土地投稿
 */
const adminApproveLandPost = async (req, res) => {
  const { id } = req.params;
  const { reviewNote } = req.body;

  const post = await LandPost.findById(id);
  if (!post) {
    return sendError(res, "找不到該投稿", 404);
  }
  if (post.status === "approved") {
    return sendError(res, "該投稿已核准", 400);
  }

  post.status = "approved";
  if (reviewNote) post.reviewNote = sanitizeText(reviewNote);
  await post.save();

  return sendSuccess(res, post.toObject());
};

/**
 * [Admin] 駁回土地投稿
 */
const adminRejectLandPost = async (req, res) => {
  const { id } = req.params;
  const { reviewNote } = req.body;

  if (!reviewNote || !reviewNote.trim()) {
    return sendError(res, "駁回需填寫原因", 400);
  }

  const post = await LandPost.findById(id);
  if (!post) {
    return sendError(res, "找不到該投稿", 404);
  }
  if (post.status === "rejected") {
    return sendError(res, "該投稿已駁回", 400);
  }

  post.status = "rejected";
  post.reviewNote = sanitizeText(reviewNote);
  await post.save();

  // 刪除 R2 圖片
  const keys = (post.images || []).map((img) => img.key).filter(Boolean);
  if (keys.length > 0) {
    deleteObjects(keys).catch(() => {});
  }

  return sendSuccess(res, post.toObject());
};

/**
 * [Admin] 刪除土地投稿（不限狀態，同時清除 R2 圖片）
 */
const adminDeleteLandPost = async (req, res) => {
  const { id } = req.params;

  const post = await LandPost.findById(id);
  if (!post) {
    return sendError(res, "找不到該投稿", 404);
  }

  // 刪除 R2 圖片
  const keys = (post.images || []).map((img) => img.key).filter(Boolean);
  if (keys.length > 0) {
    await deleteObjects(keys).catch((err) => {
      console.error("[Admin] 刪除 R2 圖片失敗:", err);
    });
  }

  await LandPost.findByIdAndDelete(id);

  return sendSuccess(res, null, 200, null, "已成功刪除投稿");
};

module.exports = {
  generateUploadUrl,
  createLandPost,
  getMyLandPosts,
  getLandPost,
  updateLandPost,
  deleteLandPost,
  getPublicLandPosts,
  adminListLandPosts,
  adminApproveLandPost,
  adminRejectLandPost,
  adminDeleteLandPost,
};
