const mongoose = require("mongoose");
require("dotenv").config();

const Article = require("../models/article.js");

const keywordMap = {
  "7810532c-93ec-4ad3-9e25-6de39af540b7": "遺囑與遺產分配的真相",
  "4a11a65b-8ad5-4e78-b1a8-dbb407e5c404": "合資買房必做四件事",
  "747baba7-64cc-471f-a19e-b890bc83deaf": "違建收租的風險與不公",
  "fac87c1d-d8ea-4ca4-b556-69159dad082c": "公設車位灌坪陷阱解析",
  "89c72aea-f697-472e-9557-db400d8cd20a": "地價稅暴增四倍的原因",
  "98b2f789-1b40-4e84-a0ff-623c76cb48c4": "淡市房仲三個錦囊妙計",
  "75f0f30b-25c5-4cf1-83be-7d12bfa4a6b5": "老屋都更前必知三件事",
  "ebb96737-53d7-454e-a52b-37051d66b62e": "房產傳承少做這些多繳稅",
  "revise-tax-filing-errors-quickly-check-out": "五大報稅節稅盲點檢視",
  "3cbe2a0c-68a0-48f0-ba62-b3f17eb0f4dd": "土地登記線上聲明申辦",
  "42a55e17-6833-47c9-85cd-53e99ea7c8c9": "商辦崛起法人投資轉向",
  "6a23f5bc-1a49-4414-b92c-12514bdf58a4": "新青安違規地雷全解析",
  "18cbecb1-862a-42a8-b08a-eb2d303e87ae": "違建加蓋的安全隱憂",
  "4a26970b-ed36-4055-949f-2e2cf4be2ec2": "裝潢發票省稅數十萬",
  "e2f74832-4c60-4ed7-b0a9-6eded9a6e3bb": "一生一次一生一屋節稅",
  "63208bff-6b79-4969-a02f-8540c8235642": "農地轉建地推升高房價",
  "ba7ccfa2-8ebc-4f5d-856e-662c1ef67a7f": "一屋多賣詐騙如何避免",
  "2f383257-3f90-4bb9-aa5e-95bbfff82b5f": "區段徵收與市地重劃差異",
  "1e5b953c-41db-4ce3-8a06-114f5dbf2606": "地價稅與土增稅必懂指南",
  "56e657ad-aeb9-4e40-9b96-ae9898ac9e78": "都更自主整合第一步",
  "78825047-cf93-4051-a37b-060296cd3dd9": "資產傳承三招合法節稅",
  "ebffc363-5638-4a17-9d5f-e451313105a4": "第七波打炒房政策解析",
  "885cdd33-220d-45d8-b70c-421baa222f8b": "搞懂容積率與建蔽率",
  "923cdd78-47e7-415a-9290-5f27c44ce649": "限貸令下提升核貸條件",
  "fd856b81-e96c-41d9-8f9d-61de1ebc6ae4": "三件事加速都更合建",
  "cd837c2b-39bf-4a81-8fb0-915f3380e8a2": "房貸審核拉高核貸率指南",
  "9e7a968c-7613-43ff-bcb8-493185c26209": "協議合建六種稅賦須知",
  "636a6a93-e8e9-46b6-b58a-4a6f52c42295": "不動產詐騙解密與自保",
  "ac1527a6-903f-4880-8b08-dd83cf346f1a": "遺產繼承流程一文搞懂",
  "74ec5c82-8058-46ba-b2e7-dac80c062832": "國際經驗看老屋補強",
  "3070c53a-62fd-4cd3-ab80-1a0e8a5d602e": "震後重建與都更呼聲",
  "b165bd3f-494a-4e9d-9caa-f686b1fd4472": "大安區老屋坍塌警示",
  "3a392bb5-147d-4532-9f7e-364f8bac7442": "斯文里公辦都更奇蹟",
  "e789e18e-c730-4167-8f3f-cc40e964f78b": "都更八箭降低海砂屋門檻",
  "9fa6f13a-3ca1-4057-8f8e-6ce69fc8eca8": "建築結構SRC SC RC差異",
  "f2c04acd-112a-4ae2-b4f0-e158f5b2bc50": "高公設比的秘密價值",
  "cd474b2e-388a-402a-a4fd-8f0a602eea04": "都更一坪換一坪真的可行嗎",
};

async function seedKeywords() {
  try {
    await mongoose.connect(process.env.MONGOOSE_CONNTECTION_STRING);
    console.log("DB connected");

    const entries = Object.entries(keywordMap);
    let updated = 0;

    for (const [articleId, keyword] of entries) {
      const result = await Article.updateOne(
        { id: articleId },
        { $set: { keyword } },
      );
      if (result.modifiedCount > 0) {
        updated++;
        console.log(`✅ ${keyword}`);
      } else {
        console.log(`⚠️ 未找到文章 id=${articleId}`);
      }
    }

    console.log(`\n完成：${updated}/${entries.length} 篇文章已更新 keyword`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seedKeywords();
