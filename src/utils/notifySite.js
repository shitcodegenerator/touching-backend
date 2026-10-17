/**
 * 對前站（Nuxt on Vercel）發送案件事件的唯一出口。
 *
 * 設計原則：
 * 1. **永不 throw**：任何失敗只記 log —— 通知壞掉不能影響審核結果。
 *    呼叫端要 await LINE 推播：後端跑在 Cloud Run（依請求計費），回應送出後 CPU 會被節流，
 *    射後不理的請求可能卡住或遺失（Zeabur 長駐主機時期沒有這個問題）。
 * 2. **環境變數缺失即靜默停用**：`SITE_NOTIFY_BASE_URL` 未設 → 兩個端點都不打；
 *    只有 `LINE_INTERNAL_TOKEN` 未設 → 只跳過 LINE 推播，分享圖預熱照打（它不需要密鑰）。
 * 3. **不重試**：意見回覆有 email 保底；審核通過本來零通知，最差回到現狀。
 * 4. **只送公開欄位**：payload 不得含地主姓名、電話、LINE ID、email。
 */

// notify 是輕量 API 呼叫；warm 要冷啟動 Satori/resvg 產圖，設計工作時間 10–20s（見
// server/api/og/warm.post.ts 檔頭），5 秒逾時幾乎必然 abort。兩者分開設定。
// warm 不讓呼叫端等（會把審核 API 拖到 20 秒），維持背景執行、盡力而為：
// 在 Cloud Run 上可能因 CPU 節流而沒完成，最差情況是前站在第一次開分享頁時才產圖。
const NOTIFY_TIMEOUT_MS = 5000;
const WARM_TIMEOUT_MS = 25000;

const baseUrl = () =>
  (process.env.SITE_NOTIFY_BASE_URL || "").replace(/\/+$/, "");

const postJson = async (
  path,
  body,
  headers = {},
  timeoutMs = NOTIFY_TIMEOUT_MS,
) => {
  const base = baseUrl();
  if (!base) return;

  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text();
    console.info(`[notifySite] ${path} → ${res.status} ${text.slice(0, 200)}`);
  } catch (err) {
    console.error(`[notifySite] ${path} 失敗:`, err?.message || err);
  }
};

const notifyLine = (kind, data) => {
  const token = process.env.LINE_INTERNAL_TOKEN;
  if (!token) return Promise.resolve();

  return postJson(
    "/api/line/notify",
    { memberId: data.memberId, kind, listing: data.listing },
    { "x-internal-token": token },
  );
};

// 沒有 publicSlug 表示還沒有公開頁，沒有圖可預熱
const warmShareImage = (slug) =>
  slug
    ? postJson("/api/og/warm", { slug }, {}, WARM_TIMEOUT_MS)
    : Promise.resolve();

/** 審核通過：推播（回傳的 Promise 只涵蓋推播）+ 背景預熱分享圖 */
const notifyListingApproved = (data) => {
  warmShareImage(data.listing && data.listing.slug);
  return notifyLine("approved", data);
};

/** 意見回覆／需補件：只推播（案件仍為 pending，沒有公開頁） */
const notifyListingNeedInfo = (data) => notifyLine("needInfo", data);

module.exports = { notifyListingApproved, notifyListingNeedInfo };
