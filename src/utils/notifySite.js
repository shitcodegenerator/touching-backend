/**
 * 對前站（Nuxt on Vercel）發送案件事件的唯一出口。
 *
 * 設計原則：
 * 1. **射後不理**：呼叫端不 await，任何失敗只記 log，永不 throw —— 通知壞掉不能影響審核結果。
 * 2. **環境變數缺失即靜默停用**：`SITE_NOTIFY_BASE_URL` 未設 → 兩個端點都不打；
 *    只有 `LINE_INTERNAL_TOKEN` 未設 → 只跳過 LINE 推播，分享圖預熱照打（它不需要密鑰）。
 * 3. **不重試**：意見回覆有 email 保底；審核通過本來零通知，最差回到現狀。
 * 4. **只送公開欄位**：payload 不得含地主姓名、電話、LINE ID、email。
 */

const TIMEOUT_MS = 5000;

const baseUrl = () => (process.env.SITE_NOTIFY_BASE_URL || "").replace(/\/+$/, "");

const postJson = async (path, body, headers = {}) => {
  const base = baseUrl();
  if (!base) return;

  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
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
    { "x-internal-token": token }
  );
};

// 沒有 publicSlug 表示還沒有公開頁，沒有圖可預熱
const warmShareImage = (slug) => (slug ? postJson("/api/og/warm", { slug }) : Promise.resolve());

/** 審核通過：推播 + 即時預熱分享圖 */
const notifyListingApproved = (data) =>
  Promise.all([notifyLine("approved", data), warmShareImage(data.listing && data.listing.slug)]);

/** 意見回覆／需補件：只推播（案件仍為 pending，沒有公開頁） */
const notifyListingNeedInfo = (data) => notifyLine("needInfo", data);

module.exports = { notifyListingApproved, notifyListingNeedInfo };
