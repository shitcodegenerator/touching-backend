// LINE 登入錯誤的原因判讀：讓錯誤通知信一眼看出「卡在哪一步、為什麼、影響多大、該做什麼」。
// step：token（用 code 換 token）／profile（取 LINE 個人資料）／save（寫入會員）

const STEP_LABEL = {
  token: "用授權碼向 LINE 換取 token",
  profile: "向 LINE 取得個人資料",
  save: "建立或查詢會員資料",
};

const upstreamSummary = (err) => {
  const res = err?.response;
  if (!res) return "";
  const data = typeof res.data === "object" ? JSON.stringify(res.data) : String(res.data ?? "");
  return `HTTP ${res.status} ${data}`.trim();
};

const diagnoseLineLoginError = (err, step) => {
  const data = err?.response?.data || {};
  const code = data.error;
  const description = String(data.error_description || data.message || "");
  const base = { step: STEP_LABEL[step] || step, upstream: upstreamSummary(err) };

  if (step === "token" && code === "invalid_grant" && /redirect_uri/i.test(description)) {
    return {
      ...base,
      title: "redirect_uri 與授權時不一致",
      cause: "換 token 時送出的 redirect_uri 與使用者在 LINE 授權頁時的不同（網域、http/https 或路徑有差）。",
      impact: "所有走這個網域的 LINE 登入都會失敗。",
      action: "比對前端 authorize 與 callback 的 redirect_uri，以及 LINE Developers 後台的 Callback URL 設定。",
    };
  }
  if (step === "token" && code === "invalid_grant") {
    return {
      ...base,
      title: "LINE 授權碼已使用過或已過期",
      cause: "同一個授權碼被送了第二次（使用者登入後重新整理、按返回、瀏覽器還原分頁），或使用者在 LINE 授權頁停留超過 10 分鐘才回來。",
      impact: "若這位使用者幾分鐘前已成功登入，通常沒有影響；若沒有成功紀錄，代表這次登入失敗、需要重新登入。",
      action: "到 GA4 或後台確認同時段是否有成功登入。偶發可忽略；若頻繁出現，檢查 callback 頁是否重複呼叫 /api/auth/login。",
    };
  }
  if (step === "token" && code === "invalid_client") {
    return {
      ...base,
      title: "LINE Channel ID／Secret 錯誤",
      cause: "LINE 不認得目前使用的 Channel 憑證。",
      impact: "所有 LINE 登入都會失敗。",
      action: "檢查 Zeabur 環境變數 LINE_CLIENT_ID、LINE_CLIENT_SECRET 是否與 LINE Developers 後台一致（Secret 若重新發行過要同步更新）。",
    };
  }
  if (step === "token" && code === "invalid_request") {
    return {
      ...base,
      title: "換 token 的參數缺漏",
      cause: "送給 LINE 的請求少了 code 或 redirect_uri。",
      impact: "這次登入失敗。",
      action: "檢查前端 callback 是否有帶 code 與 redirect_uri。",
    };
  }
  if (step === "profile") {
    return {
      ...base,
      title: "LINE 個人資料取得失敗",
      cause: "已拿到 token，但向 LINE 取個人資料被拒（token 無效或缺少 profile 權限）。",
      impact: "這次登入失敗。",
      action: "確認 LINE Login Channel 的 scope 含 profile、openid。",
    };
  }
  if (step === "save") {
    return {
      ...base,
      title: "會員資料寫入失敗",
      cause: `LINE 驗證成功，但查詢或建立會員時出錯：${err?.message || err}`,
      impact: "這位使用者無法完成註冊或登入。",
      action: "看下方例外堆疊；常見為資料庫連線或欄位驗證問題。",
    };
  }
  return {
    ...base,
    title: `LINE ${step === "token" ? "換取 token " : "登入"}失敗（${code || err?.response?.status || err?.message || "未知"}）`,
    cause: description || err?.message || "未分類的錯誤。",
    impact: "這次登入失敗。",
    action: "看下方「外部服務回應」與例外堆疊。",
  };
};

module.exports = { diagnoseLineLoginError };
