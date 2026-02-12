# 都更問卷系統 API 文件

## 概述

都更問卷系統提供一套完整的 RESTful API，讓發起人建立小區都更意向問卷、住戶填寫回覆、以及查詢統計數據。

**Base URL**: `https://touching-dev.com/api/questionnaire`

---

## API 端點

### 1. 建立問卷

**端點**: `POST /create`

**描述**: 發起人建立一個新的小區都更意向問卷。

**請求 Body**:
```json
{
  "initiatorName": "陳小姐",
  "phone": "0912345678",
  "lineId": "@example",
  "community": {
    "county": "新北市",
    "district": "板橋區",
    "name": "測試大廈"
  }
}
```

**欄位說明**:
- `initiatorName` (必填, string): 發起人稱呼
- `phone` (選填, string): 手機號碼（phone 和 lineId 至少填一個）
- `lineId` (選填, string): LINE ID（phone 和 lineId 至少填一個）
- `community` (必填, object): 小區資訊
  - `county` (必填, string): 縣市（例：新北市）
  - `district` (必填, string): 地區（例：板橋區）
  - `name` (必填, string): 小區名稱（例：XX大廈）

**成功回應** (200 OK):
```json
{
  "data": {
    "shortId": "Czd__6Y2",
    "questionnaireUrl": "https://touching-dev.com/questionnaire/Czd__6Y2",
    "statsUrl": "https://touching-dev.com/questionnaire/Czd__6Y2/stats?accessCode=721250",
    "accessCode": "721250"
  },
  "message": "問卷建立成功"
}
```

**錯誤回應**:
- `400 Bad Request`: 缺少必填欄位
  ```json
  { "data": false, "message": "請填寫所有必填欄位" }
  ```
- `400 Bad Request`: 缺少聯絡方式
  ```json
  { "data": false, "message": "請提供手機號碼或 LINE ID" }
  ```

**範例 cURL**:
```bash
curl -X POST https://touching-dev.com/api/questionnaire/create \
  -H "Content-Type: application/json" \
  -d '{
    "initiatorName": "陳小姐",
    "phone": "0912345678",
    "community": {
      "county": "新北市",
      "district": "板橋區",
      "name": "測試大廈"
    }
  }'
```

---

### 2. 查詢問卷基本資訊

**端點**: `GET /:shortId`

**描述**: 查詢問卷的公開資訊（小區名稱、是否啟用），用於住戶填寫前確認。

**URL 參數**:
- `shortId` (必填, string): 問卷唯一識別碼

**成功回應** (200 OK):
```json
{
  "data": {
    "shortId": "Czd__6Y2",
    "communityName": "新北市板橋區測試大廈",
    "isActive": true,
    "createdAt": "2025-11-16T15:04:24.573Z"
  }
}
```

**錯誤回應**:
- `404 Not Found`: 問卷不存在
  ```json
  { "data": false, "message": "找不到此問卷" }
  ```

**範例 cURL**:
```bash
curl -X GET https://touching-dev.com/api/questionnaire/Czd__6Y2
```

---

### 3. 提交住戶回覆

**端點**: `POST /:shortId/response`

**描述**: 住戶透過問卷連結填寫都更意向。

**URL 參數**:
- `shortId` (必填, string): 問卷唯一識別碼

**請求 Body**:
```json
{
  "supportLevel": "very_supportive",
  "comment": "我很支持都更，希望能盡快進行",
  "respondentName": "王先生",
  "contactInfo": "0987654321"
}
```

**欄位說明**:
- `supportLevel` (必填, string): 支持程度，限定值：
  - `very_supportive` - 非常支持
  - `supportive` - 支持
  - `neutral` - 中立
  - `not_supportive` - 不支持
  - `very_not_supportive` - 非常不支持
- `comment` (必填, string): 自由意見文字
- `respondentName` (選填, string): 填答者暱稱（若不提供則顯示為「匿名」）
- `contactInfo` (選填, string): 聯絡方式（手機/LINE）

**成功回應** (201 Created):
```json
{
  "data": true,
  "message": "感謝您的填寫"
}
```

**錯誤回應**:
- `400 Bad Request`: 缺少支持程度
  ```json
  { "data": false, "message": "請選擇您的支持程度" }
  ```
- `400 Bad Request`: 缺少意見
  ```json
  { "data": false, "message": "請填寫您的意見" }
  ```
- `400 Bad Request`: 無效的支持程度值
  ```json
  { "data": false, "message": "支持程度選項無效" }
  ```
- `403 Forbidden`: 問卷已停用
  ```json
  { "data": false, "message": "此問卷已關閉，無法填寫" }
  ```
- `404 Not Found`: 問卷不存在
  ```json
  { "data": false, "message": "找不到此問卷" }
  ```

**範例 cURL (完整回覆)**:
```bash
curl -X POST https://touching-dev.com/api/questionnaire/Czd__6Y2/response \
  -H "Content-Type: application/json" \
  -d '{
    "supportLevel": "very_supportive",
    "comment": "我很支持都更，希望能盡快進行",
    "respondentName": "王先生",
    "contactInfo": "0987654321"
  }'
```

**範例 cURL (匿名回覆)**:
```bash
curl -X POST https://touching-dev.com/api/questionnaire/Czd__6Y2/response \
  -H "Content-Type: application/json" \
  -d '{
    "supportLevel": "neutral",
    "comment": "還需要更多資訊才能決定"
  }'
```

---

### 4. 查詢問卷統計資料

**端點**: `GET /:shortId/stats`

**描述**: 查詢問卷的統計數據（需提供存取密碼），包含回覆總數、支持程度分布、最新意見。

**URL 參數**:
- `shortId` (必填, string): 問卷唯一識別碼

**Query 參數**:
- `accessCode` (必填, string): 6 碼存取密碼

**成功回應** (200 OK):
```json
{
  "data": {
    "initiator": {
      "name": "陳小姐",
      "phone": "0912345678",
      "lineId": ""
    },
    "community": {
      "county": "新北市",
      "district": "板橋區",
      "name": "測試大廈"
    },
    "totalResponses": 2,
    "supportDistribution": {
      "very_supportive": 1,
      "supportive": 0,
      "neutral": 1,
      "not_supportive": 0,
      "very_not_supportive": 0
    },
    "latestComments": [
      {
        "supportLevel": "neutral",
        "comment": "還需要更多資訊才能決定",
        "respondentName": "匿名",
        "createdAt": "2025-11-16T15:06:52.345Z"
      },
      {
        "supportLevel": "very_supportive",
        "comment": "我很支持都更，希望能盡快進行",
        "respondentName": "王先生",
        "createdAt": "2025-11-16T15:04:38.944Z"
      }
    ]
  }
}
```

**錯誤回應**:
- `400 Bad Request`: 缺少存取密碼
  ```json
  { "data": false, "message": "請提供存取密碼" }
  ```
- `403 Forbidden`: 密碼錯誤
  ```json
  { "data": false, "message": "存取密碼錯誤" }
  ```
- `404 Not Found`: 問卷不存在
  ```json
  { "data": false, "message": "找不到此問卷" }
  ```

**範例 cURL**:
```bash
curl -X GET "https://touching-dev.com/api/questionnaire/Czd__6Y2/stats?accessCode=721250"
```

---

### 5. 後台列出所有問卷

**端點**: `GET /admin/list`

**描述**: 管理員查詢所有問卷列表（需 Admin JWT 認證）。

**認證**: 需在 Header 中提供 Admin JWT Token
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**成功回應** (200 OK):
```json
{
  "data": [
    {
      "shortId": "Czd__6Y2",
      "community": {
        "county": "新北市",
        "district": "板橋區",
        "name": "測試大廈"
      },
      "initiator": {
        "name": "陳小姐",
        "phone": "0912345678",
        "lineId": ""
      },
      "isActive": true,
      "totalResponses": 2,
      "createdAt": "2025-11-16T15:04:24.573Z"
    }
  ]
}
```

**錯誤回應**:
- `401 Unauthorized`: 認證失敗
  ```json
  { "error": "Authentication failed" }
  ```

**範例 cURL**:
```bash
curl -X GET https://touching-dev.com/api/questionnaire/admin/list \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

---

### 6. 後台啟用/停用問卷

**端點**: `PATCH /admin/:shortId/toggle`

**描述**: 管理員切換問卷的啟用狀態（需 Admin JWT 認證）。

**URL 參數**:
- `shortId` (必填, string): 問卷唯一識別碼

**認證**: 需在 Header 中提供 Admin JWT Token
```
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

**成功回應** (200 OK):

停用問卷時:
```json
{
  "data": { "isActive": false },
  "message": "問卷已停用"
}
```

啟用問卷時:
```json
{
  "data": { "isActive": true },
  "message": "問卷已啟用"
}
```

**錯誤回應**:
- `401 Unauthorized`: 認證失敗
  ```json
  { "error": "Authentication failed" }
  ```
- `404 Not Found`: 問卷不存在
  ```json
  { "data": false, "message": "找不到此問卷" }
  ```

**範例 cURL**:
```bash
curl -X PATCH https://touching-dev.com/api/questionnaire/admin/Czd__6Y2/toggle \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

---

## 資料模型

### 問卷 (Questionnaire)

| 欄位 | 類型 | 說明 |
|------|------|------|
| `_id` | ObjectId | MongoDB 自動生成的 ID |
| `initiatorName` | String | 發起人稱呼 |
| `phone` | String | 發起人手機號碼（選填） |
| `lineId` | String | 發起人 LINE ID（選填） |
| `community.county` | String | 小區縣市 |
| `community.district` | String | 小區地區 |
| `community.name` | String | 小區名稱 |
| `shortId` | String | 8 碼唯一識別碼（unique index） |
| `accessCode` | String | 6 碼統計頁存取密碼 |
| `isActive` | Boolean | 是否啟用（預設 true） |
| `createdAt` | Date | 建立時間 |
| `updatedAt` | Date | 更新時間 |

### 問卷回覆 (QuestionnaireResponse)

| 欄位 | 類型 | 說明 |
|------|------|------|
| `_id` | ObjectId | MongoDB 自動生成的 ID |
| `questionnaireId` | ObjectId | 關聯的問卷 ID (ref: 'questionnaire') |
| `supportLevel` | String (enum) | 支持程度（very_supportive, supportive, neutral, not_supportive, very_not_supportive） |
| `comment` | String | 自由意見文字 |
| `respondentName` | String | 填答者暱稱（選填） |
| `contactInfo` | String | 聯絡方式（選填） |
| `createdAt` | Date | 填寫時間 |
| `updatedAt` | Date | 更新時間 |

---

## 前端整合說明

### 問卷 URL 格式
當發起人建立問卷後，系統會回傳 `questionnaireUrl`，格式為：
```
https://touching-dev.com/questionnaire/{shortId}
```

前端應導向此 URL，並使用 `shortId` 呼叫 `GET /:shortId` API 取得問卷資訊，確認問卷有效後顯示填寫表單。

### 統計頁 URL 格式
統計頁 URL 格式為：
```
https://touching-dev.com/questionnaire/{shortId}/stats?accessCode={accessCode}
```

前端應從 URL query 參數中提取 `accessCode`，並呼叫 `GET /:shortId/stats?accessCode=xxx` API 取得統計數據。

### 支持程度顯示對照表

| API 值 | 前端顯示文字 |
|--------|-------------|
| `very_supportive` | 非常支持 |
| `supportive` | 支持 |
| `neutral` | 中立 |
| `not_supportive` | 不支持 |
| `very_not_supportive` | 非常不支持 |

---

## 注意事項

1. **shortId 唯一性**: shortId 使用 nanoid(8) 生成，碰撞機率極低，系統會自動重試最多 3 次。
2. **accessCode 安全性**: accessCode 為 6 碼數字（000000-999999），明文儲存，適合分享但不應視為高安全性憑證。
3. **問卷停用**: 當問卷被停用（isActive=false）時，住戶無法提交新的回覆，但仍可查詢問卷資訊。
4. **匿名回覆**: 住戶可選擇不提供 `respondentName` 和 `contactInfo`，系統會將 `respondentName` 顯示為「匿名」。
5. **錯誤訊息**: 所有錯誤訊息均為繁體中文，方便前端直接顯示給使用者。
6. **CORS**: API 已設定 CORS 允許 `https://touching-dev.com` 和 `https://touching-qat.vercel.app` 等前端網域存取。
