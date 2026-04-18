# Proposal: fix-api-response-format

## Summary

修復 commit `2ad0178` (安全性強化與程式碼品質優化) 引入的 API 回應格式破壞性變更。該 commit 將所有 API 回應從舊格式改為新的 `{ success, data }` 格式，同時將 auth token 從 response body 移至 httpOnly cookie。前端 (touching-development) 已部分適配新格式，但多處端點的回應仍與前端預期不一致，導致線上功能全面異常。

## Problem

### 核心問題
`2ad0178` 這個 commit 混合了三種不同類型的變更：
1. **回應格式統一化** — 引入 `sendSuccess`/`sendError` 工具函數
2. **Token 儲存策略改變** — 從 response body 改為 httpOnly cookie
3. **程式碼風格清理** — 引號、縮排、移除無用程式碼

### 受影響端點全面盤點

| # | 端點 | 方法 | 後端新回應 | 前端預期 | 狀態 |
|---|------|------|-----------|---------|------|
| 1 | `/api/auth/login` (LINE) | POST | `{ success, data: userData }` + cookie | `res.data?._id` 取用戶 | **需確認** cookie 跨域 |
| 2 | `/api/auth/login` (Google) | POST | `{ success, data: userData }` + cookie | `res.data?._id` 取用戶 | **需確認** cookie 跨域 |
| 3 | `/api/auth/login` (FB) | POST | `{ success, data: userData }` + cookie | `res.data?._id` 取用戶 | **需確認** cookie 跨域 |
| 4 | `/api/auth/login` (account) | POST | `{ success, data: userData }` + cookie | `res.data` 取用戶 | **需確認** cookie 跨域 |
| 5 | `/api/auth/register` | POST | `{ success, data: userData }` + cookie | 無特定欄位存取 | **需確認** cookie 跨域 |
| 6 | `/api/auth/logout` | POST | `{ success, data: null }` | 無特定回應預期 | OK（新增端點） |
| 7 | `/api/auth/profile` (GET) | GET | `{ success, data: user }` | `res.data` (typed ApiResponse) | OK |
| 8 | `/api/auth/profile/:id` (PUT) | PUT | `{ success, data: updatedUser }` | `useFetch` error check | OK |
| 9 | `/api/auth/password/forget` | POST | `{ success, data: null, error }` | `res.success`, `res.error` | OK |
| 10 | `/api/auth/password/reset` | POST | `{ success, data: null }` | `res.success`, `res.error` | OK |
| 11 | `/api/auth/line/check` | POST | `{ success, data: boolean }` | `res?.data` (friendFlag) | OK |
| 12 | `/api/articles` | GET | `{ success, data: [...], meta }` | `(data.value as ApiResponse<Article[]>).data` | OK |
| 13 | `/api/articles/:id` | GET | `{ success, data: article }` | `(data.value as ApiResponse<Article>).data` | OK |
| 14 | `/api/categories` | GET | `{ success, data: [...] }` | `data.value.data` | OK |
| 15 | `/api/types` | GET | `{ success, data: [...] }` | `res.data` (typeList) | OK |
| 16 | `/api/questions` | GET | `{ success, data: [...] }` | `data.value.data` | OK |
| 17 | `/api/question` | POST | `{ success, data: question }` | `useFetch` error check | OK |
| 18 | `/api/indicator/list` | GET | `{ success, data: [...] }` | **待查** (需確認前端存取方式) |
| 19 | `/api/indicator/formatted` | GET | 直接 `res.json(result)` (未用 sendSuccess) | **不一致** |
| 20 | `/api/indicator/:index` | GET | `{ success, data: sorted }` | **待查** |
| 21 | `/api/indicator/batch` | POST | `{ success, data: grouped }` | **待查** |
| 22 | `/api/questionnaire/create` | POST | `{ success, data: {...} }` | `response` 直接取 (typed) | **不一致** |
| 23 | `/api/questionnaire/:shortId` | GET | `{ success, data: {...} }` | `response.data` | OK |
| 24 | `/api/questionnaire/:shortId/response` | POST | `{ success, data: true }` | `response.message` | **不一致** |
| 25 | `/api/questionnaire/:shortId/stats` | GET | `{ success, data: {...} }` | `response.data` | OK |

### 關鍵跨域 Cookie 問題

後端設定 `sameSite: 'strict'`，但：
- 後端域名: `touching-backend.vercel.app`
- 前端域名: `touching-dev.com`

**`sameSite: strict` 不允許跨域傳送 cookie**，即使 `credentials: 'include'` 也不行。這意味著 httpOnly cookie 方案在當前架構下完全無法運作，所有需要認證的端點都會失敗。

## Proposed Solution

### 1. 修復 Cookie sameSite 設定
將 `sameSite` 從 `'strict'` 改為 `'none'`（跨域 cookie 必須），並確保 `secure: true`。

### 2. 修正 `getFormattedIndicators` 回應格式
此端點遺漏了 `sendSuccess` 包裝，直接 `res.json(result)`，需統一使用 `sendSuccess`。

### 3. 修正 Questionnaire 回應格式
- `createQuestionnaire`：前端 type 定義的 `CreateQuestionnaireResponse` 預期 `{ data, message }`，後端 `sendSuccess` 回 `{ success, data }`，缺少 `message`。需更新前端 type 或後端回應。
- `submitResponse`：前端讀 `response.message`，但 `sendSuccess` 不回傳 `message`。需在 `sendSuccess` 結果中包含 message，或修改前端。

### 4. 更新 `openspec/project.md` 文件
API 回應格式說明需從 `{ data, message, token }` 更新為 `{ success, data, error?, meta? }`。

## Impact

- **修復範圍**: 後端 3 個檔案 (`cookie.js`, `indicatorController.js`, `response.js`)
- **前端無需改動**: 前端 `types/questionnaire.ts` 可微調但非必要（型別定義比較寬鬆不會報錯）
- **風險**: 低 — 修正都是讓後端回應符合前端已實作的 `ApiResponse<T>` 格式
- **向後相容**: 完全相容 — 不改變已正確的端點

## Out of Scope

- 增加測試覆蓋率
- 重構認證架構（例如改用 refresh token 機制）
- 效能優化
