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

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: ["Content-Type", "Authorization", "X-Idempotency-Key"],
};

module.exports = { corsOptions, isAllowedOrigin };
