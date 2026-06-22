const nodemailer = require("nodemailer");

// 收件信箱（可用環境變數覆寫，預設寄給開發者）
const NOTIFY_EMAIL = process.env.ERROR_NOTIFY_EMAIL || "dontz3210@gmail.com";
const SENDER = "touchingdevelopment.service@gmail.com";

// 節流：相同錯誤在此時間窗內只寄一次
const THROTTLE_WINDOW_MS = 5 * 60 * 1000; // 5 分鐘
// 寄信逾時保護：避免 SMTP 卡住拖慢錯誤回應
const SEND_TIMEOUT_MS = 8000;

// 寄信時需遮蔽的敏感欄位（避免密碼 / token 外洩到信箱）
const SENSITIVE_KEYS = [
  "password",
  "pass",
  "token",
  "code",
  "id_token",
  "access_token",
  "refresh_token",
  "accesscode",
  "secret",
  "authorization",
];

// 記憶體層級節流表。
// 注意：serverless（Vercel）warm instance 各自獨立、跨 instance 不共享，
// 因此此節流是「盡力而為」，足以擋掉單一 instance 的瞬間爆量，但無法做到全域唯一。
const lastSentMap = new Map();

let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.GMAIL_PASSWORD) return null; // 未設定寄信密碼則停用通知
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SENDER, pass: process.env.GMAIL_PASSWORD },
  });
  return transporter;
};

// 判斷此錯誤是否需要寄信通知：
// - 401（沒權限）一律不寄
// - 5xx 伺服器錯誤一定寄
// - 400 且帶有原始例外物件（被 catch 包成 400 的「真正例外」）才寄
// - 其餘正常 4xx（驗證失敗、密碼錯誤、404、409…）不寄
const shouldNotify = (statusCode, error) => {
  if (statusCode === 401) return false;
  if (statusCode >= 500) return true;
  if (statusCode === 400 && error) return true;
  return false;
};

const isThrottled = (key) => {
  const now = Date.now();
  const last = lastSentMap.get(key);
  if (last && now - last < THROTTLE_WINDOW_MS) return true;
  lastSentMap.set(key, now);
  // 順手清理過期項目，避免無限成長
  if (lastSentMap.size > 500) {
    for (const [k, t] of lastSentMap) {
      if (now - t > THROTTLE_WINDOW_MS) lastSentMap.delete(k);
    }
  }
  return false;
};

const redact = (value) => {
  if (!value || typeof value !== "object") return value;
  const clone = Array.isArray(value) ? [] : {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
      clone[k] = "[已遮蔽]";
    } else if (v && typeof v === "object") {
      clone[k] = redact(v);
    } else {
      clone[k] = v;
    }
  }
  return clone;
};

const escapeHtml = (input) =>
  String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildHtml = ({ method, path, statusCode, message, error, req }) => {
  const taiwanTime = new Date().toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
  });
  let body = {};
  try {
    body = redact(req && req.body ? req.body : {});
  } catch (_) {
    body = {};
  }
  const stack = error?.stack || (error ? String(error) : "（無例外物件）");
  const pre = "background:#f5f5f5;padding:10px;white-space:pre-wrap;word-break:break-all";
  return `
    <h2>🚨 踏取 API 錯誤通知</h2>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><td><b>時間</b></td><td>${escapeHtml(taiwanTime)}</td></tr>
      <tr><td><b>API</b></td><td><b>${escapeHtml(method)} ${escapeHtml(path)}</b></td></tr>
      <tr><td><b>狀態碼</b></td><td>${escapeHtml(statusCode)}</td></tr>
      <tr><td><b>錯誤訊息</b></td><td>${escapeHtml(message)}</td></tr>
      <tr><td><b>使用者ID</b></td><td>${escapeHtml(req?.userData?.userId || "（未登入/無）")}</td></tr>
      <tr><td><b>IP</b></td><td>${escapeHtml(req?.ip || req?.headers?.["x-forwarded-for"] || "")}</td></tr>
      <tr><td><b>User-Agent</b></td><td>${escapeHtml(req?.headers?.["user-agent"] || "")}</td></tr>
    </table>
    <h3>例外堆疊 / 詳細</h3>
    <pre style="${pre}">${escapeHtml(stack)}</pre>
    <h3>Request Body（已遮蔽敏感欄位）</h3>
    <pre style="${pre}">${escapeHtml(JSON.stringify(body, null, 2))}</pre>
  `;
};

/**
 * 寄送 API 錯誤通知信。設計為「絕不拋錯、絕不影響 API 回應」。
 * 呼叫端可 await（確保 serverless 在回應前完成寄送），亦可 fire-and-forget。
 *
 * @param {object}  args
 * @param {object?} args.req         Express request（可為 null，如 process 層級錯誤）
 * @param {number}  args.statusCode  HTTP 狀態碼
 * @param {string}  args.message     回應給前端的錯誤訊息
 * @param {Error?}  args.error       原始例外物件（有則代表是真正例外）
 */
const notifyError = async ({ req, statusCode, message, error } = {}) => {
  try {
    if (!shouldNotify(statusCode, error)) return;

    const method = req?.method || "PROCESS";
    const fullUrl = req?.originalUrl || req?.url || "(no-request)";
    const path = String(fullUrl).split("?")[0];

    const key = `${method} ${path} ${statusCode}`;
    if (isThrottled(key)) return;

    const tx = getTransporter();
    if (!tx) return; // 未設定 GMAIL_PASSWORD，靜默停用

    const mailOptions = {
      from: SENDER,
      to: NOTIFY_EMAIL,
      subject: `[踏取API錯誤] ${statusCode} ${method} ${path}`,
      html: buildHtml({ method, path, statusCode, message, error, req }),
    };

    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("寄信逾時")), SEND_TIMEOUT_MS);
    });
    try {
      await Promise.race([tx.sendMail(mailOptions), timeout]);
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    // 通知本身失敗不可影響 API；僅記錄
    console.error("[errorNotifier] 寄送錯誤通知失敗:", e?.message || e);
  }
};

module.exports = { notifyError, shouldNotify };
