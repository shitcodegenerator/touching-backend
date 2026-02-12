# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

這是一個 Node.js + Express + MongoDB 的後端 API 服務，為「踏取國際開發」不動產資訊平台提供資料服務。主要功能包括用戶認證、文章管理、經濟指標數據管理等。

## 開發環境設定

### 啟動開發伺服器
```bash
yarn dev
```
使用 nodemon 在 port 3006 啟動開發伺服器，支援熱重載。

### 部署
專案透過 Vercel 部署，設定檔為 `vercel.json`。

## 架構說明

### 目錄結構
```
src/
├── controllers/     # 業務邏輯層
├── models/         # Mongoose 資料模型
├── routes/         # API 路由定義
├── middleware/     # 中介層（JWT 認證等）
├── email/          # Email 模板
└── config.js       # MongoDB 連線設定
```

### 核心模組

#### 1. 認證系統 (authController.js)
- **多平台登入支援**: LINE、Google、Facebook、帳號密碼
- **JWT Token 機制**: 7 天有效期，使用 `process.env.AUTH_KEY` 簽發
- **密碼重設流程**:
  - 透過 email 發送 5 碼驗證碼
  - Token 1 小時後過期
  - 使用 bcrypt (salt rounds: 15) 加密密碼

#### 2. 使用者模型 (user.js)
- 支援多種第三方平台 ID: `google_id`, `facebook_id`, `line_id`
- 瀏覽歷程追蹤: `visits` 陣列記錄標題、URL、時間、停留時長
- 訂閱狀態管理: `subscribe`, `isConsent`, `isLineFriend`

#### 3. 指標資料系統 (indicatorController.js)
- **經濟指標管理**: 包含 GDP、CPI、匯率、房市數據等 50+ 種指標
- **資料格式**: 民國年格式（例: `114/1` 表示民國 114 年 1 月）
- **Composite Index**: `index + date` 複合唯一索引
- **初始化函數**:
  - `seedExchangeRates()`: 在 index.js 啟動時執行
  - `clearIndicatorValues(indexes)`: 刪除指定指標的所有資料

#### 4. 都更問卷系統 (questionnaireController.js)
- **都更意向調查**: 讓民眾快速建立小區都更意向問卷並收集住戶意見
- **shortId 生成**: 使用 nanoid(8) 產生 URL-safe 的 8 碼唯一識別碼
- **統計頁存取控制**: 6 碼隨機數字 accessCode，明文儲存
- **支持程度分級**: 5 級制（very_supportive, supportive, neutral, not_supportive, very_not_supportive）
- **API 端點**:
  - POST `/api/questionnaire/create` - 建立問卷
  - GET `/api/questionnaire/:shortId` - 查詢問卷基本資訊
  - POST `/api/questionnaire/:shortId/response` - 提交回覆
  - GET `/api/questionnaire/:shortId/stats?accessCode=xxx` - 查詢統計（需密碼）
  - GET `/api/questionnaire/admin/list` - 後台列表（需 Admin JWT）
  - PATCH `/api/questionnaire/admin/:shortId/toggle` - 啟用/停用（需 Admin JWT）
- **資料模型**:
  - `questionnaire` - 問卷主表（發起人資料、shortId、accessCode、isActive）
  - `questionnaireResponse` - 回覆表（關聯 questionnaireId、支持程度、意見、暱稱、聯絡方式）

#### 5. 文章系統 (article.js)
- 使用 UUID 作為主鍵 (`_id` 和 `id`)
- 支援分類關聯 (`categoryId` references `category`)
- 包含作者、摘要、內容、圖片等完整欄位

### 中介層

#### JWT 認證 (authenticate.js)
- 從 `Authorization` header 提取 Bearer token
- 驗證後將 `userId` 和 `username` 附加到 `req.userData`
- 401 錯誤訊息: "您的登入階段已過期，請重新登入"

#### Admin 認證 (authenticateAdmin.js)
- 使用獨立的 `process.env.ADMIN_KEY` 進行驗證

### 資料庫

#### 連線設定 (config.js)
- **連線字串**: `process.env.MONGOOSE_CONNTECTION_STRING`
- **超時設定**:
  - connectTimeoutMS: 30000 (30秒)
  - socketTimeoutMS: 45000 (45秒)
  - maxPoolSize: 10

### API 路由結構

所有 API 端點前綴：
- `/api/auth/*` - 認證相關 (authRoutes, actionRoutes)
- `/api/*` - 一般資源 (articleRoutes, questionRoutes, typeRoutes, indicatorRoutes)

### CORS 設定

允許的來源:
- http://localhost:8888
- http://localhost:5173
- https://touching-dev.com
- https://touching-qat.vercel.app

### Email 服務

使用 nodemailer + Gmail SMTP:
- 寄件地址: `touchingdevelopment.service@gmail.com`
- 用途: 密碼重設、會員通知、訂閱提醒

## 開發注意事項

### 環境變數
確保 `.env` 檔案包含以下必要變數:
- `MONGOOSE_CONNTECTION_STRING`: MongoDB 連線字串
- `AUTH_KEY`: JWT 簽發金鑰（會員）
- `ADMIN_KEY`: JWT 簽發金鑰（管理員）
- `DRIVE_KEY`: Google Drive API 私鑰（用於檔案上傳）

### 資料日期格式
- 所有經濟指標日期使用**民國年**格式: `YYY/M` (例: `114/1`)
- 使用者建立時間使用 JavaScript `Date` 物件

### 密碼安全
- bcrypt salt rounds 設定為 15
- 密碼欄位在查詢時需使用 `.select('-password')` 排除

### 指標資料維護
- 新增指標資料前，確認 `getIndicatorLabel()` 中是否有對應的中文標籤
- 批次更新指標時，優先使用 `findOneAndUpdate` with `upsert: true`
- 清除資料前使用 `clearIndicatorValues([indexes])` 避免重複

### OpenSpec 規範
當請求涉及以下內容時，應參考 `@/openspec/AGENTS.md`:
- 規劃或提案 (proposal, spec, change, plan)
- 新功能、破壞性變更、架構調整
- 重大效能或安全性工作
- 需求不明確時的權威規範確認
