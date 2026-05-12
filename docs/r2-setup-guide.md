# Cloudflare R2 儲存設定指南

本指南說明如何取得 R2 相關環境變數，供土地案件圖片上傳功能使用。

---

## 需要取得的環境變數

| 變數名稱 | 說明 | 範例 |
|----------|------|------|
| `R2_ACCOUNT_ID` | Cloudflare 帳號 ID | `a1b2c3d4e5f6...` |
| `R2_ACCESS_KEY_ID` | R2 API Token 的 Access Key | `abcdef1234567890` |
| `R2_SECRET_ACCESS_KEY` | R2 API Token 的 Secret Key | `secret1234567890abcdef` |
| `R2_BUCKET_NAME` | R2 Bucket 名稱 | `touching-images` |
| `R2_PUBLIC_URL` | Bucket 的公開存取網址 | `https://images.touching-dev.com` |

---

## 步驟一：取得 Account ID

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左側選單點擊 **R2 Object Storage**
3. 右側 **Account ID** 即為 `R2_ACCOUNT_ID`

---

## 步驟二：建立 Bucket

1. 在 R2 頁面點擊 **Create bucket**
2. 輸入 Bucket 名稱（例如 `touching-images`），此名稱即為 `R2_BUCKET_NAME`
3. 選擇地區（建議 Asia Pacific）
4. 點擊 **Create bucket**

---

## 步驟三：設定公開存取（取得 R2_PUBLIC_URL）

有兩種方式，擇一即可：

### 方式 A：使用 R2 自帶公開網址

1. 進入剛建立的 Bucket
2. 點擊 **Settings** 頁籤
3. 找到 **Public access** 區塊
4. 點擊 **Allow Access**，啟用後會得到一個網址如：
   `https://pub-xxxx.r2.dev`
5. 此網址即為 `R2_PUBLIC_URL`

### 方式 B：綁定自訂網域（推薦）

1. 在 Bucket 的 **Settings** 頁籤
2. 找到 **Custom Domains** 區塊
3. 點擊 **Connect Domain**
4. 輸入你的子網域（例如 `images.touching-dev.com`）
5. 依指示完成 DNS 設定
6. 此網域即為 `R2_PUBLIC_URL`（例如 `https://images.touching-dev.com`）

---

## 步驟四：建立 API Token（取得 Access Key / Secret Key）

1. 回到 R2 主頁面
2. 點擊右上角 **Manage R2 API Tokens**
3. 點擊 **Create API token**
4. 設定：
   - **Token name**：自訂名稱（例如 `touching-backend`）
   - **Permissions**：選擇 **Object Read & Write**
   - **Specify bucket(s)**：選擇剛建立的 Bucket（或 Apply to all buckets）
   - **TTL**：依需求設定（建議不設過期，或設長期）
5. 點擊 **Create API Token**
6. 頁面會顯示：
   - **Access Key ID** → 即為 `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → 即為 `R2_SECRET_ACCESS_KEY`

> **Secret Access Key 只會顯示一次，請立即複製保存。**

---

## 步驟五：設定 CORS（允許前端上傳）

1. 進入 Bucket → **Settings** 頁籤
2. 找到 **CORS Policy** 區塊，點擊 **Edit CORS Policy**（或 **Add CORS policy**）
3. 貼上以下設定：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://touching-dev.com",
      "https://touching-qat.vercel.app"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

4. 點擊 **Save**

---

## 步驟六：寫入 .env

將取得的值填入專案根目錄的 `.env`：

```env
R2_ACCOUNT_ID=你的Account_ID
R2_ACCESS_KEY_ID=你的Access_Key_ID
R2_SECRET_ACCESS_KEY=你的Secret_Access_Key
R2_BUCKET_NAME=你的Bucket名稱
R2_PUBLIC_URL=https://你的公開網址
```

---

## 驗證

啟動伺服器確認無報錯：

```bash
yarn dev
```

測試上傳 API（需先登入取得 token）：

```bash
curl -X POST http://localhost:3006/api/land-post/upload-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contentType": "image/jpeg"}'
```

成功回應應包含 `url`（預簽名上傳網址）和 `publicUrl`（公開存取網址）。
