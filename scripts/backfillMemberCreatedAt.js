/**
 * 修復會員 created_at：以 ObjectId 內建的建立時間取代被凍結的預設值。
 *
 * 背景：models/user.js 原本寫 default: new Date()，只在後端啟動時算一次，
 * 每位會員的 created_at 都是「他註冊前後端最後一次重啟的時間」。
 * ObjectId 的前 4 bytes 就是寫入時間（精確到秒），可用來還原真正的註冊時間。
 *
 * 用法：
 *   預演（只讀）：ENV_PATH=../touching-backend/.env node scripts/backfillMemberCreatedAt.js
 *   寫入：      ENV_PATH=../touching-backend/.env node scripts/backfillMemberCreatedAt.js --apply
 *
 * 安全設計：
 * - 預設只讀，必須帶 --apply 才寫入
 * - 寫入前把每筆的原始值存成回復檔（scripts/member-created-at-rollback-<時間>.json）
 * - 更新條件同時比對原本的 created_at，期間若被其他程式改過就不覆蓋
 * - created_at 比 _id 時間還晚的資料視為異常，只回報、不修改
 * - 報告只輸出 _id 與日期，不輸出姓名、信箱等個資
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: process.env.ENV_PATH || path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const APPLY = process.argv.includes("--apply");
const TOLERANCE_MS = 60 * 1000;
const SAMPLE_SIZE = 10;

const toDay = (date) => (date ? new Date(date).toISOString().slice(0, 10) : "(缺值)");

const classify = (doc) => {
  if (!(doc._id instanceof mongoose.Types.ObjectId)) return "skipNonObjectId";
  const idTime = doc._id.getTimestamp().getTime();
  if (!doc.created_at) return "fix";
  const current = new Date(doc.created_at).getTime();
  if (idTime - current > TOLERANCE_MS) return "fix";
  if (current - idTime > TOLERANCE_MS) return "anomalyLater";
  return "ok";
};

const main = async () => {
  const uri = process.env.MONGOOSE_CONNTECTION_STRING;
  if (!uri) throw new Error("找不到 MONGOOSE_CONNTECTION_STRING，請用 ENV_PATH 指定 .env");

  await mongoose.connect(uri);
  const members = mongoose.connection.db.collection("members");
  const docs = await members.find({}, { projection: { _id: 1, created_at: 1 } }).toArray();

  const buckets = { fix: [], ok: [], anomalyLater: [], skipNonObjectId: [] };
  docs.forEach((doc) => buckets[classify(doc)].push(doc));

  const frozenDays = buckets.fix.reduce((acc, doc) => {
    const day = toDay(doc.created_at);
    return { ...acc, [day]: (acc[day] || 0) + 1 };
  }, {});

  console.log(`模式：${APPLY ? "寫入" : "預演（只讀）"}`);
  console.log(`會員總數 ${docs.length}｜需修正 ${buckets.fix.length}｜已正確 ${buckets.ok.length}｜異常（created_at 晚於 _id）${buckets.anomalyLater.length}｜非 ObjectId ${buckets.skipNonObjectId.length}`);
  console.log("需修正者目前 created_at 的日期分布（前 15 名）：");
  Object.entries(frozenDays)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([day, count]) => console.log(`  ${day}  ${count} 人`));
  console.log(`抽樣 ${Math.min(SAMPLE_SIZE, buckets.fix.length)} 筆（依註冊時間新→舊）：`);
  [...buckets.fix]
    .sort((a, b) => b._id.getTimestamp() - a._id.getTimestamp())
    .slice(0, SAMPLE_SIZE)
    .forEach((doc) => console.log(`  ${doc._id}  ${doc.created_at ? new Date(doc.created_at).toISOString() : "(缺值)"}  →  ${doc._id.getTimestamp().toISOString()}`));
  if (buckets.anomalyLater.length) {
    console.log("異常資料（不修改）：");
    buckets.anomalyLater.slice(0, SAMPLE_SIZE).forEach((doc) => console.log(`  ${doc._id}  created_at=${new Date(doc.created_at).toISOString()}  _id=${doc._id.getTimestamp().toISOString()}`));
  }

  if (!APPLY || buckets.fix.length === 0) {
    await mongoose.disconnect();
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const rollbackPath = path.join(__dirname, `member-created-at-rollback-${stamp}.json`);
  const rollback = buckets.fix.map((doc) => ({ _id: String(doc._id), created_at: doc.created_at ?? null }));
  fs.writeFileSync(rollbackPath, JSON.stringify(rollback, null, 2));
  console.log(`已寫出回復檔：${rollbackPath}`);

  const ops = buckets.fix.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id, created_at: doc.created_at ?? null },
      update: { $set: { created_at: doc._id.getTimestamp() } },
    },
  }));
  const result = await members.bulkWrite(ops, { ordered: false });
  console.log(`寫入完成：matched=${result.matchedCount} modified=${result.modifiedCount}（預期 ${ops.length}）`);
  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error("執行失敗：", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
