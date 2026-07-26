const mongoose = require("mongoose");
const { nanoid } = require("nanoid");

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
        "hotel_building_sale",
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
    // 土地類型（SEO 分類用，選填，可複選）。大面積土地常為複合式分區，故為陣列；
    // enum 逐元素驗證；值需與前端 constants/landMutual.ts 的 LandType 一致。
    landType: {
      type: [String],
      enum: [
        "farmland",
        "building",
        "residential",
        "commercial",
        "industrial",
        "forest",
        "slope",
        "road",
        "public_facility",
        "other",
      ],
      default: undefined,
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
    // 土地持分（分子／分母），純數字、各 ≤6 位數
    landShareNumerator: {
      type: Number,
      min: 0,
    },
    landShareDenominator: {
      type: Number,
      min: 0,
    },
    // 地主人數，1–999（≤3 位數）
    landOwnerCount: {
      type: Number,
      min: 0,
    },
    // 容積率（%），≤3 位數
    floorAreaRatio: {
      type: Number,
      min: 0,
    },
    // 建蔽率（%），≤3 位數
    buildingCoverageRatio: {
      type: Number,
      min: 0,
    },
    // 面寬（文字）。多數為單一數字（米），但允許複合值（如「128米/43米」），
    // 故用字串不限數字；表單一般仍以數字輸入，API 亦接受純數字。
    frontageWidth: {
      type: String,
      maxlength: 30,
    },
    // 縱深（純數字，允許小數 2 位）
    lotDepth: {
      type: Number,
      min: 0,
    },
    // 臨路條件（文字，≤20 字）
    roadCondition: {
      type: String,
      maxlength: 20,
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
    // 單價（萬元/坪），純數字、允許小數 2 位
    unitPrice: {
      type: Number,
      min: 0,
    },
    // 是否持有該案件的委託（授權）書：投稿者已取得地主出售委託授權
    hasAuthorizationLetter: {
      type: Boolean,
      default: false,
    },
    // 是否直接對所有權人/買方（依案件類型：租售對地主、購入/承租資產對買方）
    directOwnerContact: {
      type: Boolean,
      default: false,
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
    // 內部人員「意見回覆」歷史（可多次）。與 reviewNote（核准/駁回備註）分離：
    // 意見回覆不改變案件狀態（仍為 pending），供審核人員與投稿者往返溝通。
    reviewReplies: {
      type: [
        {
          content: { type: String, required: true, maxlength: 1000 },
          reviewerName: {
            type: String,
            default: "踏取審核人員",
            maxlength: 30,
          },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: undefined,
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
    // 是否同意個資法（相關）使用。強制勾選由前端把關；後端僅接受並儲存，
    // 不設 required（保護早於本次變更、缺此欄位的既有文件於審核 save() 不失敗）。
    agreedToPrivacy: {
      type: Boolean,
      default: false,
    },
    lastEditedAt: {
      type: Date,
    },
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    // 部署環境標記：Vercel Production 前端投稿為 "prod"、Preview(qat 分支)為 "qat"。
    // 由前端 BFF 代理依 VERCEL_ENV 於 query 注入，後端據此隔離資料：
    // 正式站公開端點只回 env≠"qat"（含缺此欄位的既有文件），QAT 只回 env="qat"。
    env: {
      type: String,
      enum: ["prod", "qat"],
      default: "prod",
      index: true,
    },
  },
  { timestamps: true },
);

// Compound indexes
landPostSchema.index({ userId: 1, createdAt: -1 });
landPostSchema.index({ status: 1, visibility: 1, createdAt: -1 });
landPostSchema.index({ status: 1, visibility: 1, city: 1, createdAt: -1 });
landPostSchema.index({ status: 1, visibility: 1, landType: 1, createdAt: -1 });
landPostSchema.index({ publicSlug: 1 }, { unique: true, sparse: true });
landPostSchema.index({ userId: 1, createdAt: 1 });
landPostSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// 案件被核准且為公開可見時，自動產生 URL-safe publicSlug，提供 SEO 詳情頁使用
landPostSchema.pre("save", function (next) {
  if (
    !this.publicSlug &&
    this.status === "approved" &&
    this.visibility === "platform_public"
  ) {
    this.publicSlug = nanoid(10);
  }
  next();
});

module.exports = mongoose.model("LandPost", landPostSchema);
