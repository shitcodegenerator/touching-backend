/**
 * 為既有 approved + platform_public 案件補上 publicSlug
 * 使用方式： node scripts/backfillPublicSlugs.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");
const LandPost = require("../src/models/landPost.js");

const run = async () => {
  if (!process.env.MONGODB_URI) {
    console.error("缺少 MONGODB_URI");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("已連線 MongoDB");

  const targets = await LandPost.find({
    status: "approved",
    visibility: "platform_public",
    $or: [{ publicSlug: { $exists: false } }, { publicSlug: null }],
  }).select("_id");

  console.log(`需要補 slug 的案件數：${targets.length}`);

  let success = 0;
  for (const post of targets) {
    let attempt = 0;
    while (attempt < 5) {
      try {
        const slug = nanoid(10);
        await LandPost.updateOne(
          { _id: post._id, publicSlug: { $in: [null, undefined, ""] } },
          { $set: { publicSlug: slug } },
        );
        success += 1;
        break;
      } catch (err) {
        // 極低機率 unique 衝突，重試
        if (err.code === 11000) {
          attempt += 1;
          continue;
        }
        console.error(`更新 ${post._id} 失敗：`, err.message);
        break;
      }
    }
  }

  console.log(`完成：成功 ${success} / ${targets.length}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
