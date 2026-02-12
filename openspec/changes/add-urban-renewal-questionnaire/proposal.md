# Proposal: 都更加速包 - 小區問卷漏斗系統

## Why

目前缺乏一個低門檻的工具，讓雙北地區「希望自己小區可以都更但不知道怎麼開始」的民眾能快速發起都更意向調查。現有流程需要民眾自行組織、聯繫整合商，門檻過高導致許多潛在案源流失。

本系統透過簡單的問卷機制，讓發起人只需填寫基本資訊就能產生專屬小區的問卷連結，分享到社區群組收集鄰居意向，同時為整合商提供結構化的潛在案源數據，降低前期接觸成本。

## What Changes

新增「都更意向問卷系統」，包含以下功能：

- **問卷建立 API**（POST `/api/questionnaire/create`）
  - 發起人填寫稱呼、小區名稱（縣市/地區/名稱）、聯絡方式（手機/LINE）
  - 系統產生 8 碼 nanoid 作為 shortId
  - 同時產生統計頁專用的 6 碼隨機存取密碼
  - 回傳問卷 URL 和統計頁 URL（含密碼參數）

- **問卷資訊查詢 API**（GET `/api/questionnaire/:shortId`）
  - 返回小區名稱、是否啟用（isActive）
  - 不包含發起人個資或統計數據
  - 用於住戶填寫前確認問卷有效性

- **住戶回覆提交 API**（POST `/api/questionnaire/:shortId/response`）
  - 接收：支持程度（5 級制：非常支持/支持/中立/不支持/非常不支持）、自由意見（必填）、暱稱（選填）、聯絡方式（選填）
  - 驗證問卷是否啟用（isActive）
  - 儲存回覆並增加問卷的回覆計數

- **問卷統計查詢 API**（GET `/api/questionnaire/:shortId/stats?accessCode=xxx`）
  - 需驗證 accessCode 是否正確
  - 返回：發起人資料、回覆總數、各支持程度數量、最新 10 筆意見（匿名顯示）
  - 發起人和後台管理員使用

- **後台問卷管理 API**（需 Admin 認證）
  - GET `/api/admin/questionnaire/list` - 列出所有問卷（含發起人資料、統計摘要）
  - PATCH `/api/admin/questionnaire/:shortId/toggle` - 啟用/停用問卷

## Impact

### 受影響的 Specs
- **新增** `questionnaire-management` - 問卷建立、查詢、統計、管理
- **新增** `resident-response` - 住戶回覆提交與驗證

### 受影響的程式碼
- **新增** `src/models/questionnaire.js` - 問卷 Model
- **新增** `src/models/questionnaireResponse.js` - 回覆 Model
- **新增** `src/controllers/questionnaireController.js` - 業務邏輯
- **新增** `src/routes/questionnaireRoutes.js` - API 路由
- **修改** `index.js` - 註冊新的路由

### 技術風險
- nanoid 套件需要新增到專案（輕量級，無重大相依問題）
- 統計頁密碼採用明文儲存（accessCode），因為是低敏感度的查詢權限，不是用戶帳號密碼
- 縣市/地區資料硬編碼在前端，後端只接收字串，未來若需調整需前後端協調

### 效能考量
- 問卷查詢需在 `shortId` 欄位建立唯一索引
- 回覆統計查詢使用聚合計算（`$group` + `$count`），預期單一問卷回覆量 <500 筆，效能可接受
- 最新意見查詢使用 `sort + limit(10)`，影響較小

### 安全性考量
- shortId 使用 8 碼 nanoid（URL-safe 字元），碰撞機率極低
- accessCode 使用 6 碼隨機數字（000000-999999），單一問卷暴力破解成本低，但無批量影響
- 未來可考慮加入 rate limiting 保護統計頁查詢
