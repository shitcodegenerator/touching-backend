# Tasks: 都更加速包 - 小區問卷漏斗系統

## 1. 環境準備與相依套件

- [x] 1.1 安裝 `nanoid` 套件（`yarn add nanoid@^3.3.7`）
- [x] 1.2 驗證套件安裝成功（檢查 `package.json` 和 `yarn.lock`）

## 2. 資料模型實作

- [x] 2.1 建立 `src/models/questionnaire.js`
  - Schema 欄位：initiatorName, phone, lineId, community (county/district/name), shortId (unique), accessCode, isActive, createdAt
  - 設定 shortId 唯一索引
  - 使用 Mongoose timestamps
- [x] 2.2 建立 `src/models/questionnaireResponse.js`
  - Schema 欄位：questionnaireId (ref: 'questionnaire'), supportLevel (enum), comment, respondentName, contactInfo, createdAt
  - 設定 questionnaireId 索引
  - supportLevel enum: very_supportive, supportive, neutral, not_supportive, very_not_supportive
  - 使用 Mongoose timestamps

## 3. Controller 業務邏輯實作

- [x] 3.1 建立 `src/controllers/questionnaireController.js`
- [x] 3.2 實作 `createQuestionnaire` 函數
  - 驗證必填欄位（initiatorName, community, phone/lineId 至少一個）
  - 使用 nanoid(8) 產生 shortId
  - 產生 6 碼隨機數字作為 accessCode（000000-999999）
  - 處理 shortId 碰撞（最多重試 3 次）
  - 回傳 shortId, questionnaireUrl, statsUrl, accessCode
- [x] 3.3 實作 `getQuestionnaireInfo` 函數
  - 透過 shortId 查詢問卷
  - 回傳 shortId, communityName（格式化為「縣市+地區+名稱」）, isActive, createdAt
  - 處理 404（找不到問卷）
- [x] 3.4 實作 `getQuestionnaireStats` 函數
  - 驗證 accessCode 是否正確（回傳 403 若錯誤）
  - 查詢問卷基本資訊（initiator, community）
  - 聚合統計各 supportLevel 數量（使用 Mongoose aggregate）
  - 查詢最新 10 筆回覆（sort by createdAt desc, limit 10）
  - 回傳結構化統計資料
- [x] 3.5 實作 `submitResponse` 函數
  - 驗證問卷存在且 isActive 為 true
  - 驗證必填欄位（supportLevel, comment）
  - 驗證 supportLevel 是否為有效 enum 值
  - 建立 questionnaireResponse 記錄
  - 回傳 201 與成功訊息
- [x] 3.6 實作 `listAllQuestionnaires` 函數（Admin）
  - 查詢所有問卷並排序（createdAt desc）
  - 對每個問卷聚合計算 totalResponses
  - 回傳問卷陣列（含 shortId, community, initiator, isActive, totalResponses, createdAt）
- [x] 3.7 實作 `toggleQuestionnaireStatus` 函數（Admin）
  - 查詢問卷並切換 isActive 狀態
  - 回傳更新後的 isActive 值與訊息

## 4. 路由定義

- [x] 4.1 建立 `src/routes/questionnaireRoutes.js`
- [x] 4.2 定義公開路由（無需認證）：
  - POST `/create` → createQuestionnaire
  - GET `/:shortId` → getQuestionnaireInfo
  - POST `/:shortId/response` → submitResponse
  - GET `/:shortId/stats` → getQuestionnaireStats
- [x] 4.3 定義管理員路由（需 authenticateAdmin）：
  - GET `/admin/list` → listAllQuestionnaires
  - PATCH `/admin/:shortId/toggle` → toggleQuestionnaireStatus
- [x] 4.4 在 `index.js` 註冊路由（`app.use('/api/questionnaire', questionnaireRoutes)`）

## 5. 錯誤處理與驗證

- [x] 5.1 確保所有錯誤訊息使用繁體中文
- [x] 5.2 Controller 中加入 try-catch 區塊處理資料庫錯誤
- [x] 5.3 驗證 shortId 格式（8 碼英數字）
- [x] 5.4 驗證 accessCode 格式（6 碼數字）
- [x] 5.5 處理 Mongoose validation 錯誤並轉換為友善訊息

## 6. 資料庫索引驗證

- [x] 6.1 啟動開發伺服器（`yarn dev`）
- [x] 6.2 使用 MongoDB Compass 或 mongosh 檢查索引：
  - `questionnaire.shortId` 唯一索引
  - `questionnaireResponse.questionnaireId` 索引
- [x] 6.3 若索引未自動建立，手動執行 Mongoose 同步（或等待首次寫入觸發）

## 7. API 測試

- [x] 7.1 測試問卷建立流程（POST `/api/questionnaire/create`）
  - 驗證回傳的 shortId, accessCode 格式
  - 驗證 questionnaireUrl 和 statsUrl 正確性
- [x] 7.2 測試問卷資訊查詢（GET `/api/questionnaire/:shortId`）
  - 驗證回傳的 communityName 格式化正確
  - 測試不存在的 shortId（應回傳 404）
- [x] 7.3 測試住戶回覆提交（POST `/api/questionnaire/:shortId/response`）
  - 測試完整回覆（含暱稱與聯絡方式）
  - 測試匿名回覆（僅必填欄位）
  - 測試無效 supportLevel（應回傳 400）
  - 測試向已停用問卷提交（應回傳 403）
- [x] 7.4 測試統計資料查詢（GET `/api/questionnaire/:shortId/stats?accessCode=xxx`）
  - 測試正確 accessCode（應回傳完整統計）
  - 測試錯誤 accessCode（應回傳 403）
  - 測試缺少 accessCode（應回傳 400）
- [x] 7.5 測試後台問卷列表（GET `/api/admin/questionnaire/list`，需 Admin JWT）
  - 驗證排序（最新在最前）
  - 驗證 totalResponses 計算正確
- [x] 7.6 測試後台啟用/停用（PATCH `/api/admin/questionnaire/:shortId/toggle`，需 Admin JWT）
  - 測試切換 true → false
  - 測試切換 false → true

## 8. 邊界條件與效能測試

- [x] 8.1 測試 shortId 碰撞重試邏輯（模擬 E11000 錯誤）
- [x] 8.2 測試統計查詢效能（建立 100 筆回覆，驗證查詢速度 <500ms）
- [x] 8.3 測試空問卷統計（totalResponses 為 0 時，supportDistribution 應為全 0）
- [x] 8.4 測試極長意見文字（comment 超過 1000 字元，應正常儲存）

## 9. 整合與部署

- [x] 9.1 確認 CORS 設定允許前端網域存取新 API
- [x] 9.2 確認 `.env` 檔案包含必要環境變數（MONGOOSE_CONNTECTION_STRING, ADMIN_KEY）
- [x] 9.3 在本地環境完整測試所有 API（使用 Postman/Insomnia）
- [ ] 9.4 Commit 程式碼並 Push 到 `main` 分支
- [ ] 9.5 驗證 Vercel 自動部署成功
- [ ] 9.6 在正式環境測試至少一個完整流程（建立問卷 → 提交回覆 → 查詢統計）

## 10. 文件與交付

- [x] 10.1 撰寫 API 文件（可使用 Postman Collection 或 Swagger）
- [x] 10.2 提供範例 cURL 指令給前端團隊
- [x] 10.3 提供問卷 URL 格式說明（`{FRONTEND_URL}/questionnaire/{shortId}`）
- [x] 10.4 提供統計頁 URL 格式說明（`{FRONTEND_URL}/questionnaire/{shortId}/stats?accessCode={accessCode}`）
- [x] 10.5 更新 `CLAUDE.md` 或 README，記錄新增的問卷系統說明
