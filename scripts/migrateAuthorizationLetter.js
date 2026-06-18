/**
 * 將 description / landCondition 中提到「授權書」的既有案件，
 * 批次把 hasAuthorizationLetter 設為 true。
 *
 * 關鍵字採用「授權書」：經實際掃描 71 筆資料，命中 51 筆且全為正面敘述
 * （已有委售/委託出售授權書）。可正確排除「所有權人不授權委售」(無「授權書」三字) 的反例。
 *
 * 使用方式：
 *   node scripts/migrateAuthorizationLetter.js          # dry-run（僅預覽，不寫入）
 *   node scripts/migrateAuthorizationLetter.js --apply  # 實際更新
 */

require("dotenv").config();
const mongoose = require("mongoose");
const LandPost = require("../src/models/landPost.js");

const KEYWORD = "授權書";

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

  // description 或 landCondition 任一含「授權書」即命中
  const filter = {
    $or: [
      { description: { $regex: KEYWORD } },
      { landCondition: { $regex: KEYWORD } },
    ],
  };

  const docs = await LandPost.find(filter)
    .select("_id status description hasAuthorizationLetter")
    .lean();

  const needUpdate = docs.filter((d) => d.hasAuthorizationLetter !== true);

  console.log(`命中「${KEYWORD}」：${docs.length} 筆`);
  console.log(`其中尚未標記、需更新：${needUpdate.length} 筆\n`);

  needUpdate.forEach((d) => {
    console.log(`✓ [${d.status}] ${d._id}`);
    console.log(`  ${(d.description || "").slice(0, 60)}...`);
  });

  if (!apply) {
    console.log("\n[DRY-RUN] 未寫入任何資料。確認無誤後加上 --apply 執行。");
    await mongoose.disconnect();
    return;
  }

  if (needUpdate.length === 0) {
    console.log("\n沒有需要更新的資料。");
    await mongoose.disconnect();
    return;
  }

  const result = await LandPost.updateMany(filter, {
    $set: { hasAuthorizationLetter: true },
  });
  console.log(
    `\n完成：matched=${result.matchedCount}, modified=${result.modifiedCount}`,
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
