# Spec: API Response Consistency

## Context
後端 API 在 `2ad0178` commit 後引入統一回應格式 `{ success, data }` 和 httpOnly cookie 認證。但部分端點遺漏了格式包裝，且 cookie 的 sameSite 設定阻擋跨域認證。

## MODIFIED Requirements

### Requirement: 跨域 Cookie 認證 MUST 正常運作
httpOnly cookie MUST 能在前端 (`touching-dev.com`) 與後端 (`touching-backend.vercel.app`) 之間正確傳送。

#### Scenario: LINE 登入後 cookie 跨域傳送
- **Given** 用戶透過 LINE 登入成功
- **When** 後端回傳 `Set-Cookie` header
- **Then** cookie 的 `sameSite` 為 `none`，`secure` 為 `true`
- **And** 前端後續帶 `credentials: 'include'` 的請求能攜帶該 cookie

#### Scenario: 取得用戶 Profile
- **Given** 用戶已登入且瀏覽器持有 httpOnly token cookie
- **When** 前端呼叫 `GET /api/auth/profile` with `credentials: 'include'`
- **Then** 後端從 `req.cookies.token` 讀取到 token
- **And** 回傳 `{ success: true, data: userData }`

### Requirement: 所有 API 端點回應格式 MUST 統一
所有端點 MUST 回傳 `{ success: boolean, data: T | null, error?: string, meta?: object, message?: string }` 格式。

#### Scenario: getFormattedIndicators 回傳統一格式
- **Given** 前端呼叫 `GET /api/indicator/formatted`
- **When** 後端查詢完成
- **Then** 回傳 `{ success: true, data: result }` 而非直接 `result`

#### Scenario: Questionnaire submitResponse 包含 message
- **Given** 用戶提交問卷回覆
- **When** 後端儲存成功
- **Then** 回傳 `{ success: true, data: true, message: '感謝您的填寫' }`

### Requirement: sendSuccess 工具函數 MUST 支援可選 message
`sendSuccess` 函數 MUST 支援傳入可選的 `message` 參數。

#### Scenario: 帶 message 的成功回應
- **Given** controller 呼叫 `sendSuccess(res, data, 200, null, '操作成功')`
- **When** response 被送出
- **Then** 回應 body 包含 `{ success: true, data, message: '操作成功' }`

#### Scenario: 不帶 message 的成功回應
- **Given** controller 呼叫 `sendSuccess(res, data)`
- **When** response 被送出
- **Then** 回應 body 為 `{ success: true, data }`，不包含 `message` 欄位

## Related Capabilities
- 認證系統 (authController.js)
- 指標資料系統 (indicatorController.js)
- 問卷系統 (questionnaireController.js)
