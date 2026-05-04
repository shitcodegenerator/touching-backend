/**
 * 老屋資料 seed script
 * 用法: node src/seeds/seedOldHouse.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const IndicatorV2 = require("../models/indicatorV2");

const MONGO_URI = process.env.MONGOOSE_CONNTECTION_STRING;

const quarters = [
  "112Q1",
  "112Q2",
  "112Q3",
  "112Q4",
  "113Q1",
  "113Q2",
  "113Q3",
  "113Q4",
];

// ── 數量資料 ──────────────────────────────────────
const counts = [
  // 台北市
  {
    index: 16,
    key: "台北市30-40年宅",
    values: [220589, 192570, 192605, 192556, 192543, 169193, 169073, 169048],
  },
  {
    index: 17,
    key: "台北市40-50年宅",
    values: [304196, 315732, 315745, 315729, 315653, 327174, 327214, 327264],
  },
  {
    index: 18,
    key: "台北市50年以上宅",
    values: [123519, 146770, 146606, 145576, 145271, 165112, 164523, 163848],
  },
  // 新北市
  {
    index: 19,
    key: "新北市30-40年宅",
    values: [266614, 265691, 265692, 265744, 265785, 282811, 282766, 282785],
  },
  {
    index: 20,
    key: "新北市40-50年宅",
    values: [428304, 437980, 437941, 437952, 437960, 440670, 440534, 440446],
  },
  {
    index: 21,
    key: "新北市50年以上宅",
    values: [102900, 126276, 126198, 125991, 125960, 150154, 149984, 149954],
  },
];

// ── 佔全市比例(%) ────────────────────────────────
const proportions = [
  // 台北市
  {
    index: 52,
    key: "台北市30~40年宅佔比(%)",
    values: [16.29, 21.26, 21.25, 21.22, 21.2, 18.62, 18.59, 18.54],
  },
  {
    index: 53,
    key: "台北市40~50年宅佔比(%)",
    values: [17.56, 34.86, 34.83, 34.8, 34.75, 36.0, 35.97, 35.9],
  },
  {
    index: 54,
    key: "台北市50年以上宅佔比(%)",
    values: [7.39, 16.2, 16.17, 16.04, 15.99, 18.17, 18.09, 17.97],
  },
  // 新北市
  {
    index: 55,
    key: "新北市30~40年宅佔比(%)",
    values: [15.82, 15.74, 15.67, 15.62, 15.58, 16.53, 16.48, 16.42],
  },
  {
    index: 56,
    key: "新北市40~50年宅佔比(%)",
    values: [25.42, 25.94, 25.82, 25.74, 25.67, 25.75, 25.67, 25.58],
  },
  {
    index: 57,
    key: "新北市50年以上宅佔比(%)",
    values: [6.11, 7.48, 7.44, 7.41, 7.38, 8.78, 8.74, 8.71],
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI, {
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
  });
  console.log("Connected to MongoDB");

  const allData = [...counts, ...proportions];
  const docs = [];

  for (const item of allData) {
    for (let i = 0; i < quarters.length; i++) {
      docs.push({
        index: item.index,
        key: item.key,
        date: quarters[i],
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
