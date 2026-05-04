/**
 * 預售屋成交資料 seed script
 * 用法: node src/seeds/seedPreSale.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const IndicatorV2 = require("../models/indicatorV2");

const MONGO_URI = process.env.MONGOOSE_CONNTECTION_STRING;

const dates = [
  "113/1", "113/2", "113/3", "113/4", "113/5", "113/6",
  "113/7", "113/8", "113/9", "113/10", "113/11", "113/12",
  "114/1", "114/2", "114/3", "114/4",
];

const data = [
  // 台北市
  {
    index: 28,
    key: "台北市成交量(筆)",
    values: [392, 263, 436, 764, 411, 705, 507, 344, 586, 346, 232, 408, 338, 337, 419, 163],
  },
  {
    index: 29,
    key: "台北市單坪均價(萬)",
    values: [121, 119, 120, 122, 126, 126, 126, 124, 121, 125, 121, 127, 123, 120, 120, 119],
  },
  {
    index: 30,
    key: "台北市成交均價(萬)",
    values: [3971, 4159, 4291, 4123, 4524, 4481, 4292, 4689, 4538, 4783, 4640, 4195, 4727, 4337, 4116, 4345],
  },
  // 新北市
  {
    index: 35,
    key: "新北市成交量(筆)",
    values: [1962, 1342, 1878, 2419, 1363, 2516, 1875, 1422, 1194, 511, 333, 700, 929, 617, 920, 632],
  },
  {
    index: 36,
    key: "新北市單坪均價(萬)",
    values: [59, 58, 58, 62, 59, 62, 64, 65, 67, 64, 68, 66, 73, 69, 69, 70],
  },
  {
    index: 37,
    key: "新北市成交均價(萬)",
    values: [2222, 2066, 2107, 2277, 2183, 2189, 2272, 2287, 2367, 2399, 2377, 2517, 2554, 2667, 2235, 2159],
  },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const bulkOps = [];
  for (const indicator of data) {
    for (let i = 0; i < dates.length; i++) {
      bulkOps.push({
        updateOne: {
          filter: { index: indicator.index, date: dates[i] },
          update: { $set: { value: indicator.values[i], key: indicator.key } },
          upsert: true,
        },
      });
    }
  }

  const result = await IndicatorV2.bulkWrite(bulkOps);
  console.log(
    `完成: matched=${result.matchedCount}, modified=${result.modifiedCount}, upserted=${result.upsertedCount}`,
  );

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
