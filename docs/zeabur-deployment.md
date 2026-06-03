# Zeabur 部署指南（touching-backend）

> 目的：把後端從 Vercel Hobby（serverless、鎖美東 iad1、冷啟動 ~7s）遷到
> **Zeabur 常駐服務（東京區）**，根治冷啟動，並貼近位於台灣的 MongoDB Atlas（GCP asia-east1）。
> 詳細評估見前端 repo `docs/fly-migration-assessment.md`（Fly/Zeabur 比較）。

---

## 0. 為什麼是 Zeabur

- 後端已是標準 Express + `app.listen`，常駐環境零改動即可跑
- Zeabur 台灣團隊、繁中文件、git push 即部署（與 Vercel 體驗接近，不用寫 Dockerfile）
- 支援東京區，貼近台灣 Atlas（~35ms），遠勝美東 iad1（~180ms）
- 月成本約 US$5（Developer 方案）

---

## 1. 已完成的程式準備（本分支 `chore/zeabur-ready`）

| 改動 | 檔案 | 說明 |
|---|---|---|
| `PORT` 改讀 env | `index.js` | `process.env.PORT \|\| 3006`，Zeabur 注入埠 |
| 新增 `start` script | `package.json` | `node index.js`，Zeabur build 偵測用 |
| 釘 Node 版本 | `package.json` | `engines.node = 20.x` |
| `/api/health` 健康檢查端點 | `index.js` | 已存在（perf 分支），Zeabur health check 用 |

> Zeabur 透過 `yarn.lock` + `package.json` 自動偵測 Node 專案並執行 `yarn start`，
> 不需 `Dockerfile` 或 `zbpack.json`。

---

## 2. 部署前置確認

### 2.1 MongoDB Atlas IP allowlist（重要）
Zeabur 的出口 IP 與 Vercel 不同。進 **Atlas → Network Access** 確認：
- 若為 `0.0.0.0/0`（允許所有來源）→ **免改**，Zeabur 可直接連
- 若有 IP 限制 → 需加入 Zeabur 的出口 IP（部署後於 Zeabur 服務頁查看，或暫時放寬為 `0.0.0.0/0`）

### 2.2 環境變數清單（共 18 個）
部署時需在 Zeabur 服務的 Variables 設定以下 key（值從本地 `.env` 複製）：

```
ADMIN_KEY
AUTH_KEY
DRIVE_CLIENT_EMAIL
DRIVE_CLIENT_ID
DRIVE_KEY                      # ⚠ 多行（private key），整段含 \n 一起貼
DRIVE_PRIVATE_KEY_ID
DRIVE_PROJECT_ID
GMAIL_PASSWORD
LINE_CLIENT_ID
LINE_CLIENT_SECRET
MONGOOSE_CONNTECTION_STRING
R2_ACCESS_KEY_ID
R2_ACCOUNT_ID
R2_BUCKET_NAME
R2_PUBLIC_URL
R2_SECRET_ACCESS_KEY
RSA_PRIVATE_KEY               # ⚠ 多行，整段一起貼
RSA_PUBLIC_KEY                # ⚠ 多行，整段一起貼
```

> **多行金鑰**：`DRIVE_KEY`、`RSA_PRIVATE_KEY`、`RSA_PUBLIC_KEY` 含換行。
> Zeabur Variables 的 Raw / 多行輸入框可直接貼整段（含 `-----BEGIN ...-----`）。
> 貼完務必確認換行未被壓成一行，否則金鑰解析失敗。
>
> 建議**不要**設 `NODE_ENV` 以外的多餘變數；若程式依賴 `NODE_ENV=production` 的分支
> （如 logger 格式），記得加上 `NODE_ENV=production`。

---

## 3. 部署步驟（Zeabur Dashboard）

1. 登入 [Zeabur](https://zeabur.com)，**Create Project**
2. **選擇 Region → Tokyo（東京）**（離台灣 Atlas 最近）
3. **Add Service → Deploy from GitHub** → 授權並選 `shitcodegenerator/touching-backend`
4. 選擇要部署的分支（先用本分支驗證，正式上線用 `main`）
5. Zeabur 自動偵測 Node，build 後以 `yarn start` 啟動
6. 進服務 **Variables** 頁，貼上第 2.2 節的 18 個環境變數，重新部署
7. 設定 **Health Check**（服務 Settings）：
   - Path：`/api/health`
   - 預期：HTTP 200 `{ ok: true }`
8. 取得 Zeabur 配發的網域（如 `https://<service>.zeabur.app`）

### 3.1 驗證
```bash
# 健康檢查
curl -s https://<service>.zeabur.app/api/health
# 預期：{"ok":true,"db":"connected"}

# 公開列表（確認 DB 連得到、延遲明顯下降）
curl -s -o /dev/null -w "time=%{time_total}s http=%{http_code}\n" \
  "https://<service>.zeabur.app/api/land-post/public?page=1&limit=20&sort=newest"
# 預期：暖請求 < 0.3s、無 7s 冷啟動
```

---

## 4. 前端切換（cutover，零停機）

後端 Zeabur 跑穩後，把前端 API base 指過去。

**檔案**：`touching-development/nuxt.config.ts`（約 73–80 行 `runtimeConfig.public.BASE_URL`）

目前：
```ts
BASE_URL:
  process.env.NODE_ENV === 'production'
    ? 'https://touching-backend.vercel.app/api'
    : 'http://localhost:3006/api',
```

切換建議（改成讀 env，方便日後切換 / 預覽驗證）：
```ts
BASE_URL:
  process.env.NUXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://<service>.zeabur.app/api'   // 或自訂網域 https://api.touching-dev.com/api
    : 'http://localhost:3006/api'),
```

切換流程：
1. 先在 Vercel Preview（前端）設 `NUXT_PUBLIC_BASE_URL` 指向 Zeabur，完整測一輪
   （登入、土地媒合列表 + 詳情、表單送出、圖片上傳）
2. 確認 CORS 正常（後端 `corsOptions` 已允許 `touching-dev.com`，網域不變免改）
3. 正式環境切換 `BASE_URL` → Zeabur，觀察 1–2 天
4. 無誤後下架 Vercel 後端、停用保活 cron（見第 6 節）

> **自訂網域（建議）**：在 Zeabur 綁 `api.touching-dev.com`，前端寫死自訂網域，
> 日後再換後端供應商時前端免改。

---

## 5. 回滾（rollback）

切換期間兩邊並行，回滾只需把前端 `BASE_URL` 改回
`https://touching-backend.vercel.app/api` 重新部署即可。Vercel 後端在確認穩定前**不要下架**。

---

## 6. 遷移後清理

- **停用保活 cron**：`.github/workflows/keep-warm.yml`（Zeabur 常駐不需要保活）。
  可刪除檔案，或在 GitHub Actions 頁 Disable workflow。
- **Vercel 後端下架**：確認 Zeabur 穩定 ≥ 數天後，於 Vercel 刪除後端專案。
- **`vercel.json`**：可保留（Zeabur 忽略），或一併移除。

---

## 7. 後續建議（非搬遷必要，但值得做）

- **`trust proxy`**：Zeabur/任何反向代理後，`req.ip` 與 express-rate-limit 會取到代理 IP。
  若要正確依真實客戶端 IP 限流，在 `index.js` app 建立後加
  `app.set("trust proxy", 1);`。注意 express-rate-limit v8 對過寬的 trust proxy 有驗證告警，
  設為固定層數（如 `1`）較安全。建議搬遷穩定後另案處理並測試。
- **HA（高可用）**：Zeabur 可加開副本（單機=單點故障）。小站可暫不需要。
- **CI 自動部署**：Zeabur 連 GitHub 後預設 push 自動部署，無須額外設定。

---

## 8. 效益對照

| | Vercel (iad1) | Zeabur (Tokyo) |
|---|---|---|
| 冷啟動 | 7–8s | 無（常駐） |
| API↔DB（台灣 Atlas） | ~180ms 跨太平洋 | ~35ms |
| 台灣用戶 client→API | ~250ms | ~50ms |
| 月成本 | US$0 | ~US$5 |
