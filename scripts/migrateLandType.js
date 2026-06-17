/**
 * 從既有 land post 的 landCondition（土地現況自由文字）推導結構化 landType，並回填。
 *
 * 設計原則（呼應「不盲目寫入避免污染」）：
 *   - 預設為 dry-run：只分析、輸出對照表，不寫入 DB。
 *   - 加 --apply 才實際回填，且僅回填「高信心（high）」記錄。
 *   - 低信心 / 無法判定者標記為「待人工」，不寫入。
 *   - 冪等：已有 landType 的記錄預設略過（加 --force 可重新評估）。
 *
 * landType enum 需與 models/landPost.js、前端 constants/landMutual.ts 一致：
 *   farmland 農地 / building 建地 / residential 住宅用地 / commercial 商業用地 /
 *   industrial 工業用地 / forest 林地 / slope 山坡地 / road 道路用地 / other 其他
 *
 * 使用方式：
 *   node scripts/migrateLandType.js            # dry-run，產出 scripts/landType-migration-report.json
 *   node scripts/migrateLandType.js --apply    # 實際回填高信心記錄
 *   node scripts/migrateLandType.js --apply --force  # 連已分類者一併重新評估
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const LandPost = require("../src/models/landPost.js");

const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

// 推導規則（依優先序，第一個命中者勝出）。每條含正規表達式與對應 landType。
// 順序刻意把較具體 / 易混淆者放前面（如「丁工」工業先於「建」建地）。
const RULES = [
  {
    type: "industrial",
    re: /丁工|甲工|乙工|甲種工業|乙種工業|工業區|工業用地|科技工業|丁建|丁種建築|產業園區|廠房/,
  },
  { type: "road", re: /道路用地/ },
  { type: "slope", re: /山坡地|坡地/ },
  { type: "forest", re: /林地|林業|森林/ },
  { type: "commercial", re: /商[一二三四五六]|商業區|商業用地/ },
  { type: "residential", re: /住[一二三四五六]|住宅區|住宅用地/ },
  { type: "farmland", re: /農地|農牧|農業區|農業用地|農用|水田|旱田/ },
  { type: "building", re: /建地|甲種建築|乙種建築|甲建|建築用地/ },
];

/**
 * 從文字推導 landType（可複合）。比對所有規則，回傳所有命中的類型陣列。
 * 回傳 { types: string[], confidence, matched: string[] }
 */
const derive = (text) => {
  const src = (text || "").trim();
  const types = [];
  const matched = [];
  if (src) {
    for (const rule of RULES) {
      const m = src.match(rule.re);
      if (m && !types.includes(rule.type)) {
        types.push(rule.type);
        matched.push(m[0]);
      }
    }
  }
  return { types, confidence: types.length ? "high" : "none", matched };
};

async function main() {
  if (!process.env.MONGOOSE_CONNTECTION_STRING) {
    console.error("缺少 MONGOOSE_CONNTECTION_STRING 環境變數");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGOOSE_CONNTECTION_STRING, {
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  });
  console.log(
    `DB connected（模式：${APPLY ? "APPLY 實際回填" : "DRY-RUN 僅分析"}${FORCE ? " +FORCE" : ""}）`,
  );

  const report = [];
  let applied = 0;
  let pendingManual = 0;
  let skipped = 0;

  try {
    const posts = await LandPost.find(
      {},
      "city district landType landCondition description",
    ).lean();
    console.log(`共 ${posts.length} 筆記錄`);

    for (const p of posts) {
      // 冪等：已分類（陣列非空）且未加 --force → 略過
      if (Array.isArray(p.landType) && p.landType.length && !FORCE) {
        skipped++;
        continue;
      }

      // 只依 landCondition（使用分區/用地類別）推導；不混 description，避免「臨20米道路」等描述誤觸規則
      const { types, confidence, matched } = derive(p.landCondition || "");

      const row = {
        _id: String(p._id),
        location: `${p.city || ""}${p.district || ""}`,
        landCondition: p.landCondition || "",
        existing: p.landType || null,
        derived: types,
        confidence,
        matched: matched.join("+"),
        action: "pending-manual",
      };

      if (types.length && confidence === "high") {
        if (APPLY) {
          await LandPost.updateOne(
            { _id: p._id },
            { $set: { landType: types } },
          );
          row.action = "applied";
          applied++;
        } else {
          row.action = "would-apply";
        }
      } else {
        pendingManual++;
      }
      report.push(row);
    }

    const reportPath = path.join(__dirname, "landType-migration-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");

    console.log("\n===== 結果摘要 =====");
    console.log(
      `高信心 ${APPLY ? "已回填" : "可回填"}：${APPLY ? applied : report.filter((r) => r.action === "would-apply").length} 筆`,
    );
    console.log(`待人工分類（低信心/無法判定）：${pendingManual} 筆`);
    console.log(`冪等略過（已分類）：${skipped} 筆`);
    console.log(`對照表已輸出：${reportPath}`);
    if (!APPLY)
      console.log(
        "\n這是 dry-run。確認對照表無誤後，執行 `node scripts/migrateLandType.js --apply` 實際回填。",
      );
  } catch (err) {
    console.error("執行錯誤：", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("DB disconnected");
  }
}

main();
