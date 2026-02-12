# Spec: Questionnaire Management (問卷管理)

## ADDED Requirements

### Requirement: 建立都更意向問卷
系統 SHALL 提供 API 讓發起人建立小區都更意向問卷，並產生唯一的分享連結與統計頁存取密碼。

#### Scenario: 成功建立問卷
- **GIVEN** 發起人提供有效的稱呼、小區資訊（縣市/地區/名稱）、聯絡方式（手機或 LINE）
- **WHEN** POST `/api/questionnaire/create` 被呼叫
- **THEN** 系統 SHALL 產生 8 碼 nanoid 作為 shortId
- **AND** 系統 SHALL 產生 6 碼隨機數字作為 accessCode
- **AND** 系統 SHALL 在資料庫建立 questionnaire 記錄（isActive 預設為 true）
- **AND** 系統 SHALL 回傳 HTTP 200 與以下資料：
  - `shortId`: 問卷唯一識別碼
  - `questionnaireUrl`: `{FRONTEND_URL}/questionnaire/{shortId}`
  - `statsUrl`: `{FRONTEND_URL}/questionnaire/{shortId}/stats?accessCode={accessCode}`
  - `accessCode`: 統計頁存取密碼
  - `message`: "問卷建立成功"

#### Scenario: 必填欄位缺失
- **GIVEN** 發起人未提供稱呼、小區名稱或聯絡方式之一
- **WHEN** POST `/api/questionnaire/create` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 400 與錯誤訊息："請填寫所有必填欄位"

#### Scenario: shortId 碰撞重試
- **GIVEN** 產生的 shortId 與資料庫中既有的 shortId 重複
- **WHEN** 系統嘗試儲存問卷
- **THEN** 系統 SHALL 重新產生 shortId（最多重試 3 次）
- **AND** 若 3 次後仍碰撞，系統 SHALL 回傳 HTTP 500 與錯誤訊息："系統錯誤，請稍後再試"

---

### Requirement: 查詢問卷基本資訊
系統 SHALL 提供 API 讓任何人透過 shortId 查詢問卷的公開資訊（小區名稱、是否啟用），但不包含發起人個資或統計數據。

#### Scenario: 成功查詢啟用中的問卷
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷，且 isActive 為 true
- **WHEN** GET `/api/questionnaire/abc12345` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 200 與以下資料：
  - `shortId`: "abc12345"
  - `communityName`: 小區完整名稱（縣市 + 地區 + 名稱，例："新北市板橋區XX大廈"）
  - `isActive`: true
  - `createdAt`: 問卷建立時間（ISO 8601 格式）

#### Scenario: 查詢已停用的問卷
- **GIVEN** 資料庫中存在 shortId 為 "def67890" 的問卷，但 isActive 為 false
- **WHEN** GET `/api/questionnaire/def67890` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 200 與 `isActive: false`
- **AND** 前端應根據此欄位顯示「此問卷已關閉」

#### Scenario: 查詢不存在的問卷
- **GIVEN** 資料庫中不存在 shortId 為 "xyz99999" 的問卷
- **WHEN** GET `/api/questionnaire/xyz99999` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 404 與錯誤訊息："找不到此問卷"

---

### Requirement: 查詢問卷統計資料（需密碼）
系統 SHALL 提供 API 讓發起人或後台人員透過 accessCode 查詢問卷的統計數據，包含回覆總數、各支持程度分布、最新意見。

#### Scenario: 成功查詢統計資料
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷，accessCode 為 "123456"
- **AND** 該問卷有 15 筆回覆，其中 8 筆「非常支持」、3 筆「支持」、2 筆「中立」、1 筆「不支持」、1 筆「非常不支持」
- **WHEN** GET `/api/questionnaire/abc12345/stats?accessCode=123456` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 200 與以下資料：
  - `initiator`: 發起人資訊（name, phone, lineId）
  - `community`: 小區資訊（county, district, name）
  - `totalResponses`: 15
  - `supportDistribution`:
    - `very_supportive`: 8
    - `supportive`: 3
    - `neutral`: 2
    - `not_supportive`: 1
    - `very_not_supportive`: 1
  - `latestComments`: 最新 10 筆意見陣列，每筆包含：
    - `supportLevel`: 支持程度（字串）
    - `comment`: 意見文字
    - `respondentName`: 填答者暱稱（若未提供則為 "匿名"）
    - `createdAt`: 填寫時間（ISO 8601 格式）

#### Scenario: accessCode 錯誤
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷，正確 accessCode 為 "123456"
- **WHEN** GET `/api/questionnaire/abc12345/stats?accessCode=999999` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 403 與錯誤訊息："存取密碼錯誤"

#### Scenario: 未提供 accessCode
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷
- **WHEN** GET `/api/questionnaire/abc12345/stats` 被呼叫（缺少 accessCode 參數）
- **THEN** 系統 SHALL 回傳 HTTP 400 與錯誤訊息："請提供存取密碼"

#### Scenario: 查詢不存在的問卷統計
- **GIVEN** 資料庫中不存在 shortId 為 "xyz99999" 的問卷
- **WHEN** GET `/api/questionnaire/xyz99999/stats?accessCode=123456` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 404 與錯誤訊息："找不到此問卷"

---

### Requirement: 後台列出所有問卷
系統 SHALL 提供 API 讓管理員（需 Admin JWT 認證）查詢所有問卷列表，包含發起人資料與統計摘要。

#### Scenario: 成功列出所有問卷
- **GIVEN** 管理員已通過 Admin JWT 認證
- **AND** 資料庫中有 3 筆問卷
- **WHEN** GET `/api/admin/questionnaire/list` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 200 與問卷陣列，每筆包含：
  - `shortId`: 問卷 ID
  - `community`: 小區資訊（county, district, name）
  - `initiator`: 發起人資訊（name, phone, lineId）
  - `isActive`: 是否啟用
  - `totalResponses`: 回覆總數
  - `createdAt`: 建立時間（ISO 8601 格式）
- **AND** 問卷應依建立時間降冪排序（最新的在最前）

#### Scenario: 未認證的存取
- **GIVEN** 請求未包含有效的 Admin JWT token
- **WHEN** GET `/api/admin/questionnaire/list` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 401 與錯誤訊息："需要管理員權限"

---

### Requirement: 後台啟用/停用問卷
系統 SHALL 提供 API 讓管理員（需 Admin JWT 認證）切換問卷的啟用狀態（isActive）。

#### Scenario: 成功停用啟用中的問卷
- **GIVEN** 管理員已通過 Admin JWT 認證
- **AND** 資料庫中存在 shortId 為 "abc12345" 的問卷，isActive 為 true
- **WHEN** PATCH `/api/admin/questionnaire/abc12345/toggle` 被呼叫
- **THEN** 系統 SHALL 將該問卷的 isActive 切換為 false
- **AND** 系統 SHALL 回傳 HTTP 200 與訊息："問卷已停用"
- **AND** 系統 SHALL 回傳更新後的 isActive 值（false）

#### Scenario: 成功啟用已停用的問卷
- **GIVEN** 管理員已通過 Admin JWT 認證
- **AND** 資料庫中存在 shortId 為 "def67890" 的問卷，isActive 為 false
- **WHEN** PATCH `/api/admin/questionnaire/def67890/toggle` 被呼叫
- **THEN** 系統 SHALL 將該問卷的 isActive 切換為 true
- **AND** 系統 SHALL 回傳 HTTP 200 與訊息："問卷已啟用"

#### Scenario: 未認證的停用請求
- **GIVEN** 請求未包含有效的 Admin JWT token
- **WHEN** PATCH `/api/admin/questionnaire/abc12345/toggle` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 401 與錯誤訊息："需要管理員權限"

#### Scenario: 嘗試切換不存在的問卷
- **GIVEN** 管理員已通過 Admin JWT 認證
- **AND** 資料庫中不存在 shortId 為 "xyz99999" 的問卷
- **WHEN** PATCH `/api/admin/questionnaire/xyz99999/toggle` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 404 與錯誤訊息："找不到此問卷"
