/**
 * 將「飯店/旅館/酒店/民宿」與「整棟建物（商辦/廠辦大樓）」案件
 * 的 type 批次改為 hotel_building_sale。
 *
 * 以 description 中的唯一關鍵字精準鎖定，避免誤傷其他案件。
 *
 * 使用方式：
 *   node scripts/migrateHotelBuildingType.js          # dry-run（僅預覽，不寫入）
 *   node scripts/migrateHotelBuildingType.js --apply  # 實際更新
 */

require("dotenv").config();
const mongoose = require("mongoose");
const LandPost = require("../src/models/landPost.js");

const NEW_TYPE = "hotel_building_sale";

// 每筆以一個唯一關鍵字鎖定（必須能命中且僅命中一筆）
const KEYWORDS = [
  // A 組：飯店／旅館／酒店／民宿
  "見晴山莊",
  "薇緹文旅花園飯店",
  "肯特飯店",
  "天母玉壐精品飯店",
  "佑煦行旅",
  "阿拉伯白宮",
  "馥麗温泉大飯店",
  "愛麗絲大飯店",
  "幸福讚酒店",
  "寶旺萊6號酒店",
  "麗京棧酒店",
  "天子閣商旅",
  // B 組：整棟建物（商辦／廠辦大樓）
  "環河企業大樓",
  "舊宗路二段175號",
  "忠孝新生站步行4分鐘",
];

const run = async () => {
  if (!process.env.MONGOOSE_CONNTECTION_STRING) {
    console.error("缺少 MONGOOSE_CONNTECTION_STRING");
    process.exit(1);
  }

  const apply = process.argv.includes("--apply");

  await mongoose.connect(process.env.MONGOOSE_CONNTECTION_STRING);
  console.log(
    `已連線 MongoDB（模式：${apply ? "APPLY 實際更新" : "DRY-RUN 預覽"}）\n`,
  );

  const matchedIds = [];
  const problems = [];

  for (const kw of KEYWORDS) {
    const docs = await LandPost.find({ description: { $regex: kw } })
      .select("_id type city district section description")
      .lean();

    if (docs.length === 0) {
      problems.push(`✗ 「${kw}」找不到對應案件`);
      continue;
    }
    if (docs.length > 1) {
      problems.push(
        `✗ 「${kw}」命中 ${docs.length} 筆（關鍵字不夠唯一，已略過）`,
      );
      continue;
    }

    const d = docs[0];
    const loc = `${d.city || ""}${d.district || ""}${d.section || ""}`;
    const already =
      d.type === NEW_TYPE ? "（已是新類別）" : `（原 type=${d.type}）`;
    console.log(`✓ ${kw.padEnd(16)} → ${loc} ${already}`);
    if (d.type !== NEW_TYPE) matchedIds.push(d._id);
  }

  console.log(`\n命中且需更新：${matchedIds.length} 筆`);
  if (problems.length) {
    console.log("\n需注意：");
    problems.forEach((p) => console.log("  " + p));
  }

  if (!apply) {
    console.log("\n[DRY-RUN] 未寫入任何資料。確認無誤後加上 --apply 執行。");
    await mongoose.disconnect();
    return;
  }

  if (matchedIds.length === 0) {
    console.log("\n沒有需要更新的資料。");
    await mongoose.disconnect();
    return;
  }

  const result = await LandPost.updateMany(
    { _id: { $in: matchedIds } },
    { $set: { type: NEW_TYPE } },
  );
  console.log(
    `\n完成：matched=${result.matchedCount}, modified=${result.modifiedCount}`,
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
