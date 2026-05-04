const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const connectDb = require("./src/config.js");
const cors = require("cors");
const helmet = require("helmet");
const dotEnv = require("dotenv").config();
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

const PORT = 3006;

const app = express();
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://localhost:3000",
    "https://localhost:3001",
    "https://touching-dev.com",
    "https://touching-qat.vercel.app",
    "https://touching-admin.vercel.app",
  ],
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: ["Content-Type", "Authorization"],
};

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

// 全域 rate limiting
app.use(generalLimiter);

connectDb();

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
