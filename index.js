const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const connectDb = require("./src/config.js");
const cors = require("cors");
const helmet = require("helmet");
const dotEnv = require("dotenv").config();
const { corsOptions } = require("./src/config/cors.js");
const { errorHandler, notFound } = require("./src/middleware/errorHandler.js");
const { generalLimiter } = require("./src/middleware/rateLimiter.js");
const {
  seedExchangeRates,
  clearIndicatorValues,
} = require("./src/controllers/indicatorController.js");
const authRoutes = require("./src/routes/authRoutes.js");
const articleRoutes = require("./src/routes/articleRoutes.js");
const actionRoutes = require("./src/routes/actionRoutes.js");
const typeRoutes = require("./src/routes/typeRoutes.js");
const questionRoutes = require("./src/routes/questionRoutes.js");
const indicatorRoutes = require("./src/routes/indicatorRoutes.js");
const indicatorRoutesV2 = require("./src/routes/indicatorRoutesV2.js");
const questionnaireRoutes = require("./src/routes/questionnaireRoutes.js");
const bookingRoutes = require("./src/routes/bookingRoutes.js");
const memberRoutes = require("./src/routes/memberRoutes.js");
const landPostRoutes = require("./src/routes/landPostRoutes.js");

// Zeabur / 任何 PaaS 會以 PORT 注入要監聽的埠；本地開發退回 3006
const PORT = process.env.PORT || 3006;

const app = express();

// 安全中間件
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// CORS 配置
app.use(cors(corsOptions));

// Warmup / health endpoint（置於 rate limiter 之前，保活流量不吃限流額度）。
// no-store 確保每次都打到 lambda（不被 Vercel CDN 攔截），順便喚醒並驗證 Mongo 連線，
// 讓低流量時段也保有一個溫熱實例，降低使用者被冷啟動（約 7s）打到的機率。
app.get("/api/health", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const conn = await connectDb();
    res.status(200).json({
      ok: true,
      db: conn?.readyState === 1 ? "connected" : "connecting",
    });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// 全域 rate limiting
app.use(generalLimiter);

connectDb().catch((e) => console.error("初始 DB 連線失敗:", e));

// const Type = require('./src/models/type.js');

// // 示例：添加一个新的TypeList文档
// const addTypeList = async (label, value) => {
//   try {
//     const typeList = new Type({ label, value });
//     await typeList.save();
//     console.log('TypeList added:', typeList);
//   } catch (error) {
//     console.error('Error adding TypeList:', error);
//   }
// };

// // 调用函数添加一个TypeList
// addTypeList('房市資訊', 1);
// addTypeList('都更與危老重建', 2);
// addTypeList('區段徵收、市地重劃', 3);
// addTypeList('買賣/贈與/遺產房地稅務', 4);
// addTypeList('土地價值與資產活化', 5);

// Cookie parser（必須在 bodyParser 之前）
app.use(cookieParser());

// Middleware to parse JSON data
app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auth", actionRoutes);
app.use("/api", articleRoutes);
app.use("/api", questionRoutes);
app.use("/api", typeRoutes);
app.use("/api", indicatorRoutes);
app.use("/api", indicatorRoutesV2);
app.use("/api/questionnaire", questionnaireRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api", memberRoutes);
app.use("/api/land-post", landPostRoutes);
app.get("/", (req, res) => {
  res.send("Hey this is my API running 🥳");
});

seedExchangeRates();

// clearIndicatorValues()

// 錯誤處理中間件（必須在最後）
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Now listening at ${PORT}`);
});
