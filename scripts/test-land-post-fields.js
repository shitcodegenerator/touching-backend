/**
 * 土地投稿新欄位驗證測試（離線，不需連線 DB）
 *
 * 執行：
 *   node scripts/test-land-post-fields.js
 *
 * 驗證三件事（對應 tasks 1.8）：
 *   1. 建立含新欄位的投稿 → Joi 通過、Mongoose model 驗證通過
 *   2. 既有案件（缺新欄位、缺 agreedToPrivacy）→ model 驗證通過（模擬審核 save() 不報錯）
 *   3. 超限數值 → Joi 回錯（對應 API 400）
 *
 * 另驗證：landType 'public_facility'（公保地）可用、'forest'/'slope' 仍保留可用。
 */

const mongoose = require("mongoose");
const LandPost = require("../src/models/landPost.js");
const {
  createLandPostSchema,
} = require("../src/controllers/landPostController.js");

let passed = 0;
let failed = 0;

const ok = (name) => {
  passed++;
  console.log(`  ✔ ${name}`);
};
const bad = (name, detail) => {
  failed++;
  console.log(`  ✖ ${name}${detail ? `  → ${detail}` : ""}`);
};

// Joi：預期通過
const expectJoiPass = (name, payload) => {
  const { error } = createLandPostSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) bad(name, error.details.map((d) => d.message).join("; "));
  else ok(name);
};

// Joi：預期失敗（模擬 400）
const expectJoiFail = (name, payload) => {
  const { error } = createLandPostSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });
  if (error) ok(`${name}（如預期被擋：${error.details[0].message}）`);
  else bad(name, "應被擋卻通過");
};

// Model：預期通過（validateSync 無錯）
const expectModelPass = (name, doc) => {
  const err = new LandPost(doc).validateSync();
  if (err) bad(name, Object.values(err.errors).map((e) => e.message).join("; "));
  else ok(name);
};

const oid = () => new mongoose.Types.ObjectId();

// ── 共用有效資料 ──
const validCreatePayload = {
  type: "sell",
  contactName: "王小明",
  city: "臺北市",
  district: "中正區",
  landType: ["public_facility"],
  section: "城中段",
  landNumbers: ["0001-0000"],
  approximateLocation: "鄰近車站",
  landArea: 100,
  landAreaUnit: "ping",
  landShareNumerator: 1,
  landShareDenominator: 1000,
  landOwnerCount: 5,
  floorAreaRatio: 300,
  buildingCoverageRatio: 60,
  frontageWidth: 12.55,
  lotDepth: 30.5,
  roadCondition: "臨 8 米道路，雙面臨路",
  landCondition: "空地",
  description: "測試案件",
  priceBudget: "總價 1200 萬",
  unitPrice: 35.75,
  hasAuthorizationLetter: true,
  visibility: "platform_public",
  images: [],
  contactPhone: "0912345678",
  contactLine: "",
  agreedToTerms: true,
  agreedToPrivacy: true,
};

console.log("\n[1] 建立含新欄位的投稿");
expectJoiPass("Joi：完整新欄位 payload 通過", validCreatePayload);
expectModelPass("Model：完整新欄位 + 公保地 通過", {
  ...validCreatePayload,
  userId: oid(),
});
expectJoiPass("Joi：未帶 agreedToPrivacy 亦通過（後端選填）", {
  ...validCreatePayload,
  agreedToPrivacy: undefined,
});

console.log("\n[2] 既有案件相容（模擬審核 save 不報錯）");
expectModelPass("Model：舊資料缺新欄位/缺 agreedToPrivacy 通過", {
  userId: oid(),
  type: "sell",
  contactName: "舊案主",
  city: "臺北市",
  district: "中正區",
  description: "舊案件",
  visibility: "platform_public",
  agreedToTerms: true,
});
expectModelPass("Model：既有 landType 'forest' 仍可用", {
  ...validCreatePayload,
  userId: oid(),
  landType: ["forest"],
});
expectModelPass("Model：既有 landType 'slope' 仍可用", {
  ...validCreatePayload,
  userId: oid(),
  landType: ["slope"],
});

console.log("\n[3] 超限數值應被 Joi 擋下（對應 400）");
expectJoiFail("容積率 4 位數(1000)", { ...validCreatePayload, floorAreaRatio: 1000 });
expectJoiFail("建蔽率 4 位數(1000)", {
  ...validCreatePayload,
  buildingCoverageRatio: 1000,
});
expectJoiFail("持分分子 7 位數(1234567)", {
  ...validCreatePayload,
  landShareNumerator: 1234567,
});
expectJoiFail("地主人數 4 位數(1000)", {
  ...validCreatePayload,
  landOwnerCount: 1000,
});
expectJoiFail("臨路條件 > 20 字", {
  ...validCreatePayload,
  roadCondition: "字".repeat(21),
});
expectJoiFail("面寬為負數(-1)", { ...validCreatePayload, frontageWidth: -1 });
expectJoiFail("單價為負數(-5)", { ...validCreatePayload, unitPrice: -5 });
expectJoiFail("不合法 landType 值", {
  ...validCreatePayload,
  landType: ["not_a_type"],
});

console.log(`\n結果：通過 ${passed} 項，失敗 ${failed} 項\n`);
process.exit(failed === 0 ? 0 : 1);
