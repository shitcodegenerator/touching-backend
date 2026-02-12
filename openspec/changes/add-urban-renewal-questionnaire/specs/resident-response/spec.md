# Spec: Resident Response (住戶回覆)

## ADDED Requirements

### Requirement: 提交都更意向回覆
系統 SHALL 提供 API 讓小區住戶透過問卷 shortId 提交他們對都更的意向，包含支持程度、意見、選填的暱稱與聯絡方式。

#### Scenario: 成功提交完整回覆（含暱稱與聯絡方式）
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷，且 isActive 為 true
- **AND** 住戶提供支持程度 "very_supportive"、意見 "我很支持都更，希望能盡快進行"、暱稱 "王先生"、聯絡方式 "0912345678"
- **WHEN** POST `/api/questionnaire/abc12345/response` 被呼叫，請求 body 包含：
  ```json
  {
    "supportLevel": "very_supportive",
    "comment": "我很支持都更，希望能盡快進行",
    "respondentName": "王先生",
    "contactInfo": "0912345678"
  }
  ```
- **THEN** 系統 SHALL 在資料庫建立 questionnaireResponse 記錄，關聯到該問卷
- **AND** 系統 SHALL 記錄 createdAt 時間戳記（使用 Mongoose timestamps）
- **AND** 系統 SHALL 回傳 HTTP 201 與訊息："感謝您的填寫"

#### Scenario: 成功提交匿名回覆（僅必填欄位）
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷，且 isActive 為 true
- **AND** 住戶僅提供支持程度 "neutral"、意見 "還需要更多資訊"
- **WHEN** POST `/api/questionnaire/abc12345/response` 被呼叫，請求 body 包含：
  ```json
  {
    "supportLevel": "neutral",
    "comment": "還需要更多資訊"
  }
  ```
- **THEN** 系統 SHALL 在資料庫建立 questionnaireResponse 記錄
- **AND** `respondentName` 和 `contactInfo` 應儲存為空字串或 null
- **AND** 系統 SHALL 回傳 HTTP 201 與訊息："感謝您的填寫"

#### Scenario: 支持程度欄位缺失
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷
- **AND** 住戶僅提供意見，但未提供支持程度
- **WHEN** POST `/api/questionnaire/abc12345/response` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 400 與錯誤訊息："請選擇您的支持程度"

#### Scenario: 意見欄位缺失
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷
- **AND** 住戶僅提供支持程度，但未提供意見
- **WHEN** POST `/api/questionnaire/abc12345/response` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 400 與錯誤訊息："請填寫您的意見"

#### Scenario: 無效的支持程度值
- **GIVEN** 資料庫中存在 shortId 為 "abc12345" 的問卷
- **AND** 住戶提供的支持程度為 "invalid_value"（不在 enum 範圍內）
- **WHEN** POST `/api/questionnaire/abc12345/response` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 400 與錯誤訊息："支持程度選項無效"

#### Scenario: 嘗試向已停用的問卷提交回覆
- **GIVEN** 資料庫中存在 shortId 為 "def67890" 的問卷，但 isActive 為 false
- **AND** 住戶提供有效的支持程度與意見
- **WHEN** POST `/api/questionnaire/def67890/response` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 403 與錯誤訊息："此問卷已關閉，無法填寫"

#### Scenario: 嘗試向不存在的問卷提交回覆
- **GIVEN** 資料庫中不存在 shortId 為 "xyz99999" 的問卷
- **WHEN** POST `/api/questionnaire/xyz99999/response` 被呼叫
- **THEN** 系統 SHALL 回傳 HTTP 404 與錯誤訊息："找不到此問卷"

---

### Requirement: 支持程度值定義
系統 SHALL 使用固定的 5 級制字串常數表示住戶的都更支持程度。

#### Scenario: 驗證支持程度 enum 值
- **GIVEN** Mongoose Schema 定義 `supportLevel` 欄位
- **THEN** 系統 SHALL 僅接受以下值：
  - `"very_supportive"` - 非常支持
  - `"supportive"` - 支持
  - `"neutral"` - 中立
  - `"not_supportive"` - 不支持
  - `"very_not_supportive"` - 非常不支持
- **AND** 任何其他值應觸發 Mongoose validation 錯誤

---

### Requirement: 回覆時間戳記記錄
系統 SHALL 自動記錄每筆回覆的建立時間，用於統計頁顯示與未來趨勢分析。

#### Scenario: 自動記錄 createdAt
- **GIVEN** 住戶提交有效的問卷回覆
- **WHEN** 系統儲存 questionnaireResponse 到資料庫
- **THEN** 系統 SHALL 自動設定 `createdAt` 欄位為當前時間（使用 Mongoose timestamps）
- **AND** `createdAt` 應為 ISO 8601 格式（YYYY-MM-DDTHH:mm:ss.sssZ）
