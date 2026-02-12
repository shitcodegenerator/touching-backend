# Project Context

## Purpose
這是「踏取國際開發」不動產資訊平台的後端 API 服務，提供用戶認證、文章管理、經濟指標數據管理等功能。目標是為台灣不動產投資者提供專業的經濟數據分析、房市指標和專業文章內容。

## Tech Stack
- **Runtime**: Node.js (使用 nodemon 進行開發)
- **Framework**: Express.js
- **Database**: MongoDB (使用 Mongoose ORM)
- **Authentication**:
  - JWT (jsonwebtoken) - Token 有效期 7 天
  - Passport.js with Google OAuth 2.0
  - LINE Login API
  - Facebook Login API
  - bcrypt - 密碼加密 (salt rounds: 15)
- **Email**: nodemailer (Gmail SMTP)
- **Deployment**: Vercel
- **Package Manager**: Yarn

## Project Conventions

### Code Style
- **語言**: JavaScript (Node.js)
- **命名規範**:
  - 檔案名稱: camelCase (例: `indicatorController.js`, `authRoutes.js`)
  - 變數和函數: camelCase
  - Mongoose Models: PascalCase (例: `User`, `Article`, `Indicator`)
  - 常數: UPPER_SNAKE_CASE (用於環境變數)
- **檔案組織**:
  - Controllers: 業務邏輯層，處理請求和回應
  - Models: Mongoose Schema 定義
  - Routes: API 端點定義，使用 Express Router
  - Middleware: JWT 認證、錯誤處理等
- **錯誤訊息**: 使用繁體中文，語氣友善且具體（例: "您的登入階段已過期，請重新登入"）
- **環境變數**: 透過 `.env` 檔案管理，使用 dotenv 套件載入

### Architecture Patterns
- **MVC 模式**: Model-View-Controller 分離
  - Models: `src/models/` - Mongoose Schemas
  - Controllers: `src/controllers/` - 業務邏輯
  - Routes: `src/routes/` - API 路由定義
- **Middleware Pattern**:
  - JWT 認證中介層: `authenticate.js` (會員) 和 `authenticateAdmin.js` (管理員)
  - 從 `Authorization` header 提取 Bearer token
  - 驗證後將 `userId` 和 `username` 附加到 `req.userData`
- **Repository Pattern**:
  - 使用 Mongoose 直接在 Controller 中查詢，不使用額外的 Repository 層
- **API 設計**:
  - RESTful 風格
  - 統一前綴: `/api/auth/*` (認證)、`/api/*` (其他資源)
  - 回應格式: `{ data: ..., message: "...", token: "..." }`
- **資料庫索引策略**:
  - 使用複合索引確保資料唯一性 (例: `index + date` 在 Indicator model)
  - UUID 作為主鍵（Article model）

### Testing Strategy
- 目前專案尚未建立測試框架
- 未來建議:
  - 使用 Jest 或 Mocha 進行單元測試
  - 使用 Supertest 進行 API 整合測試
  - 測試覆蓋率目標: 80%+

### Git Workflow
- **主分支**: `main`
- **Commit 慣例**:
  - 前綴: `feat:`, `fix:`, `update:`, `refactor:`
  - 範例: "feat: update", "fix: update"
- **部署流程**:
  - Push 到 `main` 分支後，Vercel 自動部署
- **版本控制**:
  - `.gitignore` 包含: `node_modules/`, `.env`

## Domain Context

### 不動產與經濟指標領域
- **經濟指標分類**: 50+ 種指標，包含：
  - 房市數據: 購屋貸款金額/利率、建物登記、買賣移轉登記、核發使照
  - 總體經濟: GDP、CPI、經濟成長率、景氣燈號
  - 金融市場: 美台匯率、台股指數
  - 貿易數據: 進出口貿易總額
- **日期格式**:
  - 經濟指標使用**民國年**格式: `YYY/M` (例: `114/1` 表示民國 114 年 1 月)
  - 使用者資料使用 ISO Date 格式 (JavaScript Date 物件)
- **資料來源**:
  - 政府公開資料
  - 需定期更新（透過 `seedExchangeRates()` 等初始化函數）

### 用戶系統
- **多平台整合**:
  - LINE Login (主要使用者來源)
  - Google OAuth 2.0
  - Facebook Login
  - 傳統帳號密碼
- **用戶分級**: `level` 欄位 (0 = 一般會員)
- **訂閱管理**:
  - `subscribe`: 是否訂閱電子報
  - `isConsent`: 隱私政策同意
  - `isLineFriend`: LINE 官方帳號好友狀態
- **瀏覽追蹤**: `visits` 陣列記錄用戶閱讀文章的歷程（標題、URL、時間、停留時長）

### 內容管理
- **文章分類**: 透過 `categoryId` 關聯到 `category` collection
- **文章類型**:
  - 房市資訊 (type: 1)
  - 都更與危老重建 (type: 2)
  - 區段徵收、市地重劃 (type: 3)
  - 買賣/贈與/遺產房地稅務 (type: 4)
  - 土地價值與資產活化 (type: 5)

## Important Constraints

### 安全性
- **密碼加密**: bcrypt with 15 salt rounds（非常高的安全等級）
- **敏感資料排除**: 查詢用戶時必須使用 `.select('-password')` 排除密碼欄位
- **JWT Secret**:
  - 會員使用 `process.env.AUTH_KEY`
  - 管理員使用 `process.env.ADMIN_KEY`
  - Token 有效期固定為 7 天
- **密碼重設**:
  - 驗證碼 5 碼，1 小時後失效
  - 使用 crypto.randomBytes 生成安全隨機碼

### 資料庫限制
- **連線超時**:
  - connectTimeoutMS: 30000 (30秒)
  - socketTimeoutMS: 45000 (45秒)
- **連線池**: maxPoolSize 設為 10
- **索引唯一性**:
  - Indicator: `index + date` 複合索引必須唯一
  - Article: `_id` 和 `id` 都使用 UUID 且必須唯一

### CORS 政策
- **允許的來源** (白名單):
  - `http://localhost:8888`
  - `http://localhost:5173`
  - `https://touching-dev.com`
  - `https://touching-qat.vercel.app`
- **允許的 Methods**: GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS
- **允許的 Headers**: Content-Type, Authorization

### 效能考量
- **PORT**: 固定使用 3006
- **資料初始化**: `seedExchangeRates()` 在伺服器啟動時執行，需確保不影響啟動速度
- **大量資料更新**: 使用 `findOneAndUpdate` with `upsert: true` 避免重複插入

## External Dependencies

### 第三方認證服務
- **LINE Login API**:
  - Client ID: 2004045021
  - Redirect URI: `https://touching-dev.com/login/callback`
  - 用途: 用戶登入、好友狀態查詢
- **Google OAuth 2.0**:
  - 用途: 用戶登入
  - Token 驗證端點: `https://oauth2.googleapis.com/tokeninfo`
- **Facebook Login**:
  - 用途: 用戶登入
  - Secret 儲存在 JWT payload 中

### 資料庫
- **MongoDB Atlas**:
  - 連線字串: `process.env.MONGOOSE_CONNTECTION_STRING`
  - Database Name: `touchingdevelopment`
  - Collections: `member`, `article`, `indicator`, `category`, `type`, `question`, `admin`

### Email 服務
- **Gmail SMTP**:
  - 帳號: `touchingdevelopment.service@gmail.com`
  - App Password: 儲存在 `.env` 中
  - 用途: 密碼重設、會員通知、訂閱提醒、推廣信件
  - Template 位置: `src/email/`

### Google Drive API (檔案上傳)
- **Service Account Key**: `process.env.DRIVE_KEY` (Private Key in PEM format)
- 用途: 儲存用戶上傳的圖片、文件等

### Translation API
- **Google Translate API**: `@vitalets/google-translate-api`
- 用途: 可能用於多語系內容（未來功能）
