/**
 * CORS 設定
 *
 * 三層白名單：
 * 1. STATIC_ORIGINS — 寫死的本機與正式環境網址
 * 2. PREVIEW_PATTERNS — Vercel preview 浮動網址（鎖死 team hash 避免被冒名部署）
 * 3. CORS_EXTRA_ORIGINS env — 臨時加白名單用，逗號分隔
 */

const STATIC_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "https://localhost:3000",
  "https://localhost:3001",
  "https://touching-dev.com",
  // "https://touching-qat.vercel.app",
  "https://touching-admin.vercel.app",
];

// Vercel preview URL 格式:
//   https://touching-development-{deployHash}-sherrys-projects-453071e8.vercel.app
// 鎖死 sherrys-projects-453071e8（Vercel team hash）避免他人 fork 部署同名專案就能繞過 CORS
const PREVIEW_PATTERNS = [
  /^https:\/\/touching-development-[a-z0-9]+-sherrys-projects-453071e8\.vercel\.app$/,
];

const { loggerUtils } = require("../utils/logger.js");

const EXTRA_ORIGINS = (process.env.CORS_EXTRA_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true; // 允許無 origin 的請求（Postman、server-to-server、同源）
  if (STATIC_ORIGINS.includes(origin)) return true;
  if (EXTRA_ORIGINS.includes(origin)) return true;
  if (PREVIEW_PATTERNS.some((re) => re.test(origin))) return true;
  return false;
}

/**
 * 來源不在白名單是「對方沒有權限」，不是伺服器故障。
 * 一定要帶 statusCode 403 與 isOperational，否則 errorHandler 會當成 500，
 * 既誤報錯誤率，也會讓每個掃描機器人都寄一封告警信（告警疲勞）。
 */
function createCorsBlockedError(origin) {
  const error = new Error(`CORS blocked: ${origin}`);
  error.statusCode = 403;
  error.code = "CORS_BLOCKED";
  error.isOperational = true;
  return error;
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    // 403 不會進 errorHandler 的錯誤記錄，這裡自己留一筆，之後才查得到誰被擋
    loggerUtils.logSecurityEvent("CORS_BLOCKED", { origin });
    return callback(createCorsBlockedError(origin));
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
};

module.exports = { corsOptions, isAllowedOrigin };
