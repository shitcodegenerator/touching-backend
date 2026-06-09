const Joi = require("joi");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const LandPost = require("../models/landPost.js");
const LandPostInterest = require("../models/landPostInterest.js");
const User = require("../models/user.js");
const {
  generatePresignedUploadUrl,
  deleteObjects,
} = require("../utils/r2Client.js");
const { sendSuccess, sendError } = require("../utils/response.js");

const OFFICIAL_USERNAME = "touching_admin";
const OFFICIAL_DISPLAY_NAME = "踏取官方";

// 各面積單位換算成「坪」的係數（1 ㎡ = 0.3025 坪、1 公頃 = 10000 ㎡ = 3025 坪）
// 公開列表的坪數範圍篩選以此把不同單位的 landArea 統一換算後再比較
const PING_PER_SQM = 0.3025;
const PING_PER_HECTARE = 3025;

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
    .valid(
      "sell",
      "rent",
      "buy",
      "joint_development",
      "asset_lease",
      "hotel_building_sale",
      "other",
    )
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
    .valid(
      "sell",
      "rent",
      "buy",
      "joint_development",
      "asset_lease",
      "hotel_building_sale",
      "other",
    )
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
 * 公開模式下，套用官方顯示名稱或聯絡人隱碼
 */
const applyPublicDisplayFields = (postObj, ownerUsername) => {
  delete postObj.contactPhone;
  delete postObj.contactLine;

  const isOfficial = ownerUsername === OFFICIAL_USERNAME;
  postObj.isOfficial = isOfficial;

  if (isOfficial) {
    postObj.displayName = OFFICIAL_DISPLAY_NAME;
    postObj.contactName = OFFICIAL_DISPLAY_NAME;
  } else if (postObj.contactName && postObj.contactName.length > 1) {
    const masked =
      postObj.contactName[0] + "*".repeat(postObj.contactName.length - 1);
    postObj.contactName = masked;
    postObj.displayName = masked;
  } else {
    postObj.displayName = postObj.contactName || "";
  }

  return postObj;
};

/**
 * 取得單筆投稿（雙模式：擁有者 / 公開）
 */
const getLandPost = async (req, res) => {
  const { id } = req.params;
  const post = await LandPost.findById(id).populate("userId", "username");

  if (!post) {
    return sendError(res, "找不到該案件", 404);
  }

  const ownerUsername = post.userId?.username;
  const ownerId = post.userId?._id?.toString();

  const isOwner = req.userData && req.userData.userId === ownerId;

  const postObj = post.toObject();
  postObj.userId = ownerId;

  if (isOwner) {
    postObj.isOfficial = ownerUsername === OFFICIAL_USERNAME;
    return sendSuccess(res, postObj);
  }

  if (post.status !== "approved" || post.visibility !== "platform_public") {
    return sendError(res, "找不到該案件", 404);
  }

  applyPublicDisplayFields(postObj, ownerUsername);
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

  if (typeof req.query.city === "string" && req.query.city.trim()) {
    query.city = req.query.city.trim();
  }

  // 坪數範圍篩選（半開區間 [minPing, maxPing)，坪為單位）。
  // landArea 可能以坪/㎡/公頃儲存，故用 $expr + $switch 於查詢時換算成坪再比較。
  const parsePing = (v) => {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const minPing = parsePing(req.query.minPing);
  const maxPing = parsePing(req.query.maxPing);

  if (minPing !== null || maxPing !== null) {
    const pingExpr = {
      $multiply: [
        "$landArea",
        {
          $switch: {
            branches: [
              { case: { $eq: ["$landAreaUnit", "sqm"] }, then: PING_PER_SQM },
              {
                case: { $eq: ["$landAreaUnit", "hectare"] },
                then: PING_PER_HECTARE,
              },
            ],
            default: 1, // ping 或未指定單位
          },
        },
      ],
    };

    const bounds = [];
    if (minPing !== null) bounds.push({ $gte: [pingExpr, minPing] });
    if (maxPing !== null) bounds.push({ $lt: [pingExpr, maxPing] });
    const rangeExpr = bounds.length === 1 ? bounds[0] : { $and: bounds };

    // 未填面積的案件（整棟建物出售、收購需求等天生無單一面積者）視為「不限面積」特例，
    // 一律保留顯示；有填面積者才套用坪數區間。
    query.$or = [{ landArea: { $not: { $gt: 0 } } }, { $expr: rangeExpr }];
  }

  const sortOrder = req.query.sort === "oldest" ? 1 : -1;

  // 僅取公開頁需要的欄位，避免回傳 __v/version/idempotencyKey/agreedToTerms/visibility 等
  const PUBLIC_FIELDS =
    "type contactName city district section landNumbers approximateLocation landArea landAreaUnit landCondition description priceBudget images status publicSlug createdAt updatedAt userId";

  const [posts, total] = await Promise.all([
    LandPost.find(query, PUBLIC_FIELDS)
      .sort({ createdAt: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate("userId", "username")
      .lean(),
    LandPost.countDocuments(query),
  ]);

  const filteredPosts = posts.map((post) => {
    const postObj = { ...post };
    const ownerUsername = postObj.userId?.username;
    postObj.userId = postObj.userId?._id || null;
    return applyPublicDisplayFields(postObj, ownerUsername);
  });

  // 公開列表可被 Vercel 邊緣節點快取。s-maxage 維持 120s 新鮮度；
  // stale-while-revalidate 拉長到 1 天：只要一天內有人來過，快取就保有一份可立即回傳的舊資料，
  // 使用者永遠拿到 ~86ms 的 HIT，冷啟動（約 7s）只發生在背景重新驗證、不卡使用者。
  res.set(
    "Cache-Control",
    "public, s-maxage=120, stale-while-revalidate=86400",
  );
  return sendSuccess(res, filteredPosts, 200, { total, page, limit });
};

/**
 * 依 publicSlug 取得公開案件（SSR 詳情頁用，不需登入）
 */
const getPublicLandPostBySlug = async (req, res) => {
  const { slug } = req.params;
  if (!slug || typeof slug !== "string") {
    return sendError(res, "缺少 slug", 400);
  }

  const post = await LandPost.findOne({
    publicSlug: slug,
    status: "approved",
    visibility: "platform_public",
  }).populate("userId", "username");

  if (!post) {
    return sendError(res, "找不到該案件", 404);
  }

  const postObj = post.toObject();
  const ownerUsername = postObj.userId?.username;
  postObj.userId = postObj.userId?._id || null;
  // 同列表策略：拉長 SWR，詳情頁也讓使用者永遠拿到快取 HIT，冷啟動只發生在背景重新驗證
  res.set(
    "Cache-Control",
    "public, s-maxage=120, stale-while-revalidate=86400",
  );
  return sendSuccess(res, applyPublicDisplayFields(postObj, ownerUsername));
};

/**
 * 列出所有公開案件的 slug 與更新時間（供 sitemap.xml 使用，輕量資料）
 */
const getPublicLandPostSlugs = async (req, res) => {
  const items = await LandPost.find(
    {
      status: "approved",
      visibility: "platform_public",
      publicSlug: { $exists: true, $ne: null },
    },
    { publicSlug: 1, updatedAt: 1, _id: 0 },
  ).lean();

  // sitemap 資料變動不頻繁，可快取較久
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return sendSuccess(res, items);
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

// ============ 我有興趣 ============

const interestSchema = Joi.object({
  name: Joi.string().trim().min(1).max(30).required().messages({
    "string.empty": "姓名/稱呼為必填",
    "any.required": "姓名/稱呼為必填",
  }),
  phone: Joi.string().trim().allow("").max(20).optional(),
  lineId: Joi.string().trim().allow("").max(30).optional(),
  message: Joi.string().trim().min(1).max(200).required().messages({
    "string.empty": "需求說明為必填",
    "any.required": "需求說明為必填",
  }),
}).custom((value, helpers) => {
  if (!value.phone && !value.lineId) {
    return helpers.error("any.invalid", {
      message: "聯絡電話與 Line ID 至少需填一項",
    });
  }
  return value;
}, "phone-or-line");

async function sendInterestNotificationEmail({ interest, post }) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "touchingdevelopment.service@gmail.com",
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  const createdAt = new Date(interest.createdAt).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
  });

  const typeMap = {
    sell: "出售",
    rent: "出租",
    buy: "土地購入",
    joint_development: "合建",
    asset_lease: "資產租賃",
    hotel_building_sale: "飯店/建物整棟出售",
    other: "其他",
  };

  const postLocation = `${post.city || ""}${post.district || ""}${post.section ? " " + post.section : ""}`;
  const postArea = post.landArea ? `${post.landArea} 坪` : "-";

  const mailOptions = {
    from: "踏取國際開發有限公司 <touchingdevelopment.service@gmail.com>",
    to: "dontz3210@gmail.com",
    subject: `【土地興趣諮詢】${interest.name} 對 ${postLocation} 有興趣`,
    html: `
      <div style="font-family: 'Microsoft JhengHei', Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #10b981; padding-bottom: 10px;">🏷️ 新的土地興趣諮詢</h2>

        <h3 style="margin-top: 24px; color: #2c3e50;">申請人資訊</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; width: 140px; border: 1px solid #dee2e6;">姓名 / 稱呼</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${interest.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">聯絡電話</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${interest.phone || "未提供"}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">Line ID</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${interest.lineId || "未提供"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">需求說明</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6; white-space: pre-wrap;">${interest.message}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">送出時間</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${createdAt}</td>
          </tr>
        </table>

        <h3 style="margin-top: 24px; color: #2c3e50;">案件資訊</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; width: 140px; border: 1px solid #dee2e6;">案件編號</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${post._id}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">案件類型</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${typeMap[post.type] || post.type}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">位置</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${postLocation}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">面積</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${postArea}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">預算</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${post.priceBudget || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">現況</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${post.landCondition || "-"}</td>
          </tr>
        </table>

        <p style="color: #7f8c8d; font-size: 12px; margin-top: 20px;">此為系統自動通知信，請盡快聯繫申請人。</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * 提交「我有興趣」表單（auth）
 */
const createInterest = async (req, res) => {
  const { id } = req.params;
  const userId = req.userData.userId;

  const { error, value } = interestSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const detail = error.details[0];
    const message = detail.context?.message || detail.message || "表單驗證失敗";
    return sendError(res, message, 400);
  }

  const post = await LandPost.findById(id);
  if (
    !post ||
    post.status !== "approved" ||
    post.visibility !== "platform_public"
  ) {
    return sendError(res, "找不到該案件", 404);
  }

  const exists = await LandPostInterest.findOne({
    landPostId: id,
    userId,
  });
  if (exists) {
    return sendError(res, "您已對此案件送出興趣申請", 409);
  }

  const sanitize = (text) =>
    text
      ? text
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/[<>]/g, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "")
          .trim()
      : "";

  let interest;
  try {
    interest = await LandPostInterest.create({
      landPostId: id,
      userId,
      name: sanitize(value.name),
      phone: sanitize(value.phone || ""),
      lineId: sanitize(value.lineId || ""),
      message: sanitize(value.message),
    });
  } catch (err) {
    if (err.code === 11000) {
      return sendError(res, "您已對此案件送出興趣申請", 409);
    }
    throw err;
  }

  try {
    await sendInterestNotificationEmail({ interest, post });
    interest.emailSent = true;
    await interest.save();
  } catch (mailErr) {
    interest.emailError = String(mailErr?.message || mailErr).slice(0, 500);
    await interest.save();
    console.error("[interest] 發信失敗:", mailErr);
  }

  return sendSuccess(
    res,
    { _id: interest._id, landPostId: interest.landPostId },
    201,
    null,
    "已送出諮詢，官方會盡快與您聯繫",
  );
};

/**
 * 取得目前用戶所有已申請的案件 ID 清單
 */
const getMyInterests = async (req, res) => {
  const userId = req.userData.userId;
  const interests = await LandPostInterest.find({ userId })
    .select("landPostId createdAt")
    .lean();

  return sendSuccess(
    res,
    interests.map((i) => ({
      landPostId: i.landPostId.toString(),
      createdAt: i.createdAt,
    })),
  );
};

module.exports = {
  generateUploadUrl,
  createLandPost,
  getMyLandPosts,
  getLandPost,
  updateLandPost,
  deleteLandPost,
  getPublicLandPosts,
  getPublicLandPostBySlug,
  getPublicLandPostSlugs,
  adminListLandPosts,
  adminApproveLandPost,
  adminRejectLandPost,
  adminDeleteLandPost,
  createInterest,
  getMyInterests,
};
