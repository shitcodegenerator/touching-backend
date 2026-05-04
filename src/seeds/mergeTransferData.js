/**
 * 合併「本期」移轉資料到主指標
 * 將 index 25→24, 27→26, 32→31, 34→33 的資料合併
 * 合併後刪除舊的「本期」index 資料
 *
 * 用法: node src/seeds/mergeTransferData.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const IndicatorV2 = require("../models/indicatorV2");

const MONGO_URI = process.env.MONGOOSE_CONNTECTION_STRING;

const MERGE_MAP = [
  { from: 25, to: 24, label: "台北市買賣移轉棟數" },
  { from: 27, to: 26, label: "台北市第一次移轉棟數" },
  { from: 32, to: 31, label: "新北市買賣移轉棟數" },
  { from: 34, to: 33, label: "新北市第一次移轉棟數" },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  for (const { from, to, label } of MERGE_MAP) {
    const sourceData = await IndicatorV2.find({ index: from }).lean();
    console.log(`\n[${from} → ${to}] 找到 ${sourceData.length} 筆「本期」資料`);

    if (sourceData.length === 0) continue;

    const bulkOps = sourceData.map((item) => ({
      updateOne: {
        filter: { index: to, date: item.date },
        update: { $set: { value: item.value, key: label } },
        upsert: true,
      },
    }));

    const result = await IndicatorV2.bulkWrite(bulkOps);
    console.log(
      `  合併結果: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}`,
    );

    // 刪除舊的「本期」資料
    const delResult = await IndicatorV2.deleteMany({ index: from });
    console.log(`  已刪除舊 index ${from} 共 ${delResult.deletedCount} 筆`);
  }

  await mongoose.disconnect();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
