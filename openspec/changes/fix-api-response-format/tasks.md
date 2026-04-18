# Tasks: fix-api-response-format

- [x] **Task 1: 修復 Cookie sameSite 跨域問題**
  - **File**: `src/utils/cookie.js`
  - **Change**: `sameSite: 'strict'` → `sameSite: 'none'`, `secure: true`（COOKIE_OPTIONS + clearTokenCookie 兩處）
  - **Priority**: CRITICAL

- [x] **Task 2: 修復 `getFormattedIndicators` 回應格式**
  - **File**: `src/controllers/indicatorController.js`
  - **Change**: `res.status(200).json(result)` → `sendSuccess(res, result)`；錯誤處理也改用 `sendError`

- [x] **Task 3: 修正 `sendSuccess` 支援可選 message 欄位**
  - **File**: `src/utils/response.js`
  - **Change**: 新增第五參數 `message`，若有值則加入 response body

- [x] **Task 4: 修正 Questionnaire submitResponse 回傳 message**
  - **File**: `src/controllers/questionnaireController.js`
  - **Change**: `sendSuccess(res, true, 201)` → `sendSuccess(res, true, 201, null, "感謝您的填寫")`

- [x] **Task 5: 確認 CORS 設定已支援 cookie**
  - **File**: `index.js`
  - **Result**: `credentials: true` + origin 白名單已存在，無需改動

- [x] **Task 6: 更新 `openspec/project.md` API 回應格式文件**
  - **File**: `openspec/project.md`
  - **Change**: 回應格式、Token 有效期、認證方式說明已更新
