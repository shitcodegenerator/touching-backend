# Bugfix Log

跨專案可能復現的 bug 修復記錄。

---

## 2026-06-22｜Google 登入在線上環境失敗（axios.defaults 全域污染）

### 問題描述
線上環境（Vercel serverless）使用 Google 登入時，後端 `POST /api/auth/login` 持續回傳 `400 {"error":"註冊失敗，請再試一次。"}`。
本機開發環境（`yarn dev`）卻完全正常，難以重現。

### 根本原因
`authController.js` 的 LINE 相關處理（`lineLoginHandler`、`lineFriendCheck`）直接修改了**全域共享**的 axios 預設值：

```js
axios.defaults.headers["Authorization"] = `Bearer ${lineRes.data.access_token}`;
axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded";
```

在 Vercel 這類 serverless 環境中，**warm instance 會跨請求保留 module 層級的全域狀態**。當同一個 instance 先處理過一次 LINE 登入後，`axios.defaults.headers.Authorization` 就被殘留下來。

之後該 instance 處理 Google 登入時，`googleLoginHandler` 內的：

```js
await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${code}`);
```

會帶上殘留的 `Authorization: Bearer <舊的 LINE token>`。Google 的 tokeninfo 端點收到非預期的 Authorization header 後回傳 `400 invalid_token`，被 catch 後統一變成「註冊失敗，請再試一次。」。

本機重現不到，是因為每次都是全新 process、沒有先前請求污染 `axios.defaults`。

### 解決方式
不再修改全域 `axios.defaults`，改為**每次請求各自傳入 headers**（per-request config）：

```js
// LINE token
await axios.post(url, data, {
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});
// LINE profile / friendship
await axios.get(url, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

並移除 `googleLoginHandler` / `fbLoginHandler` 中無意義的全域 Content-Type 設定。

### 通用教訓（跨專案）
- **絕對不要在請求處理流程中修改 SDK／HTTP client 的全域單例設定**（`axios.defaults`、全域 interceptor、共享 client 的 header 等）。serverless / 長駐 process 會跨請求殘留，造成「本機正常、線上偶發或必現」的詭異 bug。
- 需要客製 header 時，使用 per-request config 或建立獨立的 instance（`axios.create({...})`）。
- 偵錯「本機正常、線上失敗」類問題時，優先懷疑：共享可變狀態、warm instance 殘留、環境變數差異。
