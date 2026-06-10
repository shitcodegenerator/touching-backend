/**
 * 修復被污染的 landpost.district 欄位。
 *
 * 背景：部分官方案件（飯店/建物整棟出售）在建立時，把「鄉鎮-案名」整串塞進
 * district（例如「草屯鎮-寶旺萊6號酒店」），藉此讓卡片標題顯示案名。
 * 副作用：
 *   1. 地圖筆數聚合 /public/stats 的 byDistrict 鍵變成污染值，前端用純鄉鎮名查不到、不高亮。
 *   2. 列表 /public?district=草屯鎮 精準比對失敗，篩不到。
 *
 * 修復：把 district 拆成「純鄉鎮名」+「案名」，案名寫入閒置的 publicTitle 欄位；
 * 順手把案名內的異體字「温」正規化為「溫」。
 *
 * 拆分規則：以第一個 '-' 切，前段為鄉鎮、其餘為案名（相容案名本身含 '-'）。
 * 台灣行政區名稱不含 '-'，故只處理含 '-' 的紀錄。已有 publicTitle 者跳過（可重複執行）。
 *
 * 使用方式：
 *   node scripts/fixDistrictTitle.js          # dry-run（僅預覽，不寫入）
 *   node scripts/fixDistrictTitle.js --apply  # 實際更新
 *
 * ⚠️ 寫入 PROD DB 前請先 mongodump 備份。
 */

require("dotenv").config();
const mongoose = require("mongoose");
const LandPost = require("../src/models/landPost.js");

/** 案名異體字正規化（温 → 溫） */
const normalizeTitle = (s) => (s || "").replaceAll("温", "溫");

/** 以第一個 '-' 拆出 { town, title } */
const splitDistrict = (district) => {
  const idx = district.indexOf("-");
  if (idx < 0) return { town: district.trim(), title: "" };
  return {
    town: district.slice(0, idx).trim(),
    title: normalizeTitle(district.slice(idx + 1).trim()),
  };
};

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

  // district 含 '-' 的污染資料
  const docs = await LandPost.find({ district: { $regex: "-" } })
    .select("_id city district publicTitle")
    .lean();

  console.log(`找到 district 含 '-' 的紀錄：${docs.length} 筆\n`);

  const ops = [];
  for (const d of docs) {
    const { town, title } = splitDistrict(d.district);

    if (!town) {
      console.log(`✗ _id=${d._id} district=「${d.district}」拆出空鄉鎮，已略過`);
      continue;
    }
    if (d.publicTitle) {
      console.log(
        `– 跳過 ${d.city} ${d.district}（publicTitle 已存在：「${d.publicTitle}」）`,
      );
      continue;
    }

    console.log(
      `✓ ${d.city} 「${d.district}」 → district=「${town}」, publicTitle=「${title}」`,
    );
    ops.push({
      updateOne: {
        filter: { _id: d._id },
        update: { $set: { district: town, publicTitle: title } },
      },
    });
  }

  console.log(`\n需更新：${ops.length} 筆`);

  if (!apply) {
    console.log("\n[DRY-RUN] 未寫入任何資料。確認無誤後加上 --apply 執行。");
    await mongoose.disconnect();
    return;
  }

  if (ops.length === 0) {
    console.log("\n沒有需要更新的資料。");
    await mongoose.disconnect();
    return;
  }

  const result = await LandPost.bulkWrite(ops);
  console.log(
    `\n完成：matched=${result.matchedCount}, modified=${result.modifiedCount}`,
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
