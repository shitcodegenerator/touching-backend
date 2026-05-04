/**
 * 危老統計 & 都更核定資料 seed script
 * 用法: node src/seeds/seedDangerHouse.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const IndicatorV2 = require("../models/indicatorV2");

const MONGO_URI = process.env.MONGOOSE_CONNTECTION_STRING;

// ── 危老統計件數 ──────────────────────────────────
// 日期不固定，直接存原始日期字串
const dangerDates = [
  "109/9/26",
  "111/7/31",
  "113/4/30",
  "113/6/30",
  "113/11/30",
  "114/4/30",
];

const dangerData = [
  {
    index: 58,
    key: "台北市危老重建申請件數",
    values: [548, 908, 1043, 1074, 1090, 1124],
  },
  {
    index: 59,
    key: "台北市危老重建核准件數",
    values: [292, 699, 932, 938, 976, 1000],
  },
  {
    index: 60,
    key: "新北市危老重建申請件數",
    values: [393, 555, 780, 579, 603, 622],
  },
  {
    index: 61,
    key: "新北市危老重建核准件數",
    values: [227, 441, 707, 541, 592, 608],
  },
];

// ── 都更核定案件數 ────────────────────────────────
const renewalDates = ["112年核定", "113年核定", "114年核定"];

const renewalData = [
  {
    index: 62,
    key: "台北市都市更新核定案件數",
    values: [39, 37, 19],
  },
  {
    index: 63,
    key: "新北市都市更新核定案件數",
    values: [28, 25, 6],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI, {
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
  });
  console.log("Connected to MongoDB");

  const docs = [];

  for (const item of dangerData) {
    for (let i = 0; i < dangerDates.length; i++) {
      docs.push({
        index: item.index,
        key: item.key,
        date: dangerDates[i],
        value: item.values[i],
      });
    }
  }

  for (const item of renewalData) {
    for (let i = 0; i < renewalDates.length; i++) {
      docs.push({
        index: item.index,
        key: item.key,
        date: renewalDates[i],
        value: item.values[i],
      });
    }
  }

  console.log(`準備寫入 ${docs.length} 筆資料...`);

  const bulkOps = docs.map((doc) => ({
    updateOne: {
      filter: { index: doc.index, date: doc.date },
      update: { $set: { value: doc.value, key: doc.key } },
      upsert: true,
    },
  }));

  const result = await IndicatorV2.bulkWrite(bulkOps);
  console.log(
    `完成！matched: ${result.matchedCount}, modified: ${result.modifiedCount}, upserted: ${result.upsertedCount}`,
  );

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
