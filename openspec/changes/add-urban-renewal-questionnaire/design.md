# Design: 都更加速包 - 小區問卷漏斗系統

## Context

這是一個全新的子系統，目的是為都更整合商快速收集潛在案源。主要使用者有三類：
1. **發起人**：希望小區都更的住戶，需要極簡的建立流程
2. **小區住戶**：透過 Line 群或 FB 社團連結進入填寫，需低門檻（匿名可填）
3. **後台營運方**：整合商團隊，需要結構化數據判斷是否進場

技術約束：
- 必須符合現有專案的 MVC 架構（Model/Controller/Route 分離）
- 使用 MongoDB + Mongoose ORM
- API 風格需與既有端點一致（RESTful，繁體中文錯誤訊息）
- 需考慮未來可能的擴充（如通知發起人、匯出 Excel 等）

## Goals / Non-Goals

### Goals
- 發起人可在 30 秒內建立一個小區問卷並取得分享連結
- 住戶可在 1 分鐘內完成填寫（支援匿名）
- 統計頁提供即時的回覆數量與意見摘要
- 後台可批量查看所有問卷並篩選高意向案源

### Non-Goals
- **不包含前端實作**（僅後端 API）
- **不包含 Email/LINE 推播通知**（未來 change）
- **不包含數據匯出功能**（CSV/Excel，未來 change）
- **不處理重複填寫防護**（IP/Device 指紋，超出目前範圍）
- **不處理地理位置驗證**（是否真的住該小區）

## Decisions

### 1. Data Model 設計

**決定：使用兩個獨立的 Collection**
- `questionnaire` - 儲存問卷本身（發起人資料、shortId、accessCode、isActive）
- `questionnaireResponse` - 儲存每一筆回覆（關聯 questionnaireId）

**理由：**
- 符合正規化原則，避免在 questionnaire 內嵌大量 responses 導致文檔過大
- 方便後續分頁查詢回覆、聚合統計
- 符合專案既有的關聯模式（如 Article <-> Category）

**替代方案：**
- ❌ **嵌入式設計**（responses 直接放在 questionnaire.responses 陣列）：當回覆量增長時會超過 MongoDB 16MB 文檔限制，且更新效能差

### 2. shortId 生成策略

**決定：使用 `nanoid` 套件生成 8 碼 URL-safe 隨機字串**

**理由：**
- 碰撞機率極低（8 碼字母數字組合，約 218 兆種組合）
- 輕量級套件（<500 bytes），無重度相依
- URL-safe（不含特殊字元），適合直接嵌入連結
- 業界常見方案（Next.js、Prisma 等框架均採用）

**替代方案：**
- ❌ **UUID v4**：太長（36 字元），不適合分享連結
- ❌ **自增流水號**：可預測，使用者可能遍歷其他小區問卷
- ❌ **shortid 套件**：已不維護（deprecated）

### 3. 統計頁存取控制

**決定：使用 6 碼隨機數字作為 accessCode，明文儲存**

**理由：**
- 這不是使用者帳號密碼，而是單一資源的「查詢令牌」
- 發起人需要將含 accessCode 的完整 URL 貼到群組，明文更簡單
- 即使被破解，單一問卷影響有限（不會連鎖影響其他問卷或用戶資料）
- 與既有專案的 `resetToken`（密碼重設）類似，都是一次性查詢憑證

**替代方案：**
- ❌ **JWT Token**：過度設計，且發起人沒有「登入」流程，難以管理 token 生命週期
- ❌ **bcrypt 加密**：accessCode 需要能直接回傳給發起人（URL 參數），無法使用 hash
- ⚠️ **未來改進方向**：可考慮增加 IP rate limiting，限制同一 IP 對單一問卷的統計查詢次數

### 4. 支持程度選項設計

**決定：使用 5 級制字串常數**
- `very_supportive`, `supportive`, `neutral`, `not_supportive`, `very_not_supportive`

**理由：**
- 符合問卷調查常見的 Likert Scale 標準
- 使用字串（而非數字 1-5）提高可讀性，減少前後端誤解
- 在 Mongoose Schema 中使用 `enum` 驗證，防止無效值

**替代方案：**
- ❌ **數字 1-5**：需額外文檔說明對應關係，容易混淆
- ❌ **中文字串**："非常支持"：在資料庫和 API 中使用中文增加編碼風險

### 5. 縣市/地區資料儲存

**決定：後端直接接收前端傳來的縣市/地區字串，不建立獨立 Model**

**理由：**
- 縣市/地區選項相對靜態（台灣行政區劃變動極少）
- 前端已硬編碼下拉選單，後端建立 Model 反而增加維護成本
- 符合 YAGNI 原則（You Aren't Gonna Need It）

**Schema 設計：**
```javascript
community: {
  county: { type: String, required: true },    // 例："新北市"
  district: { type: String, required: true },  // 例："板橋區"
  name: { type: String, required: true }       // 例："XX大廈"
}
```

**替代方案：**
- ❌ **建立 Location Model**：過度設計，且未來即使需要調整（如增加郵遞區號），也可從既有字串反推

### 6. API 路由設計

**決定：採用 RESTful 風格，問卷資源為主路徑**

```
POST   /api/questionnaire/create                     # 建立問卷
GET    /api/questionnaire/:shortId                   # 查詢問卷基本資訊
POST   /api/questionnaire/:shortId/response          # 提交回覆
GET    /api/questionnaire/:shortId/stats?accessCode  # 查詢統計（需密碼）
GET    /api/admin/questionnaire/list                 # 後台列表（需 Admin JWT）
PATCH  /api/admin/questionnaire/:shortId/toggle      # 啟用/停用（需 Admin JWT）
```

**理由：**
- 符合專案既有慣例（`/api/auth/*`, `/api/article/*` 等）
- `:shortId` 作為 URL 參數直觀易懂
- `stats` 子資源語義清晰（問卷的統計資料）

## Risks / Trade-offs

### 風險 1: shortId 碰撞
- **機率**：8 碼 nanoid 碰撞機率約 1/218兆，即使產生 100 萬筆問卷仍極低
- **緩解措施**：在 Mongoose Schema 中設定 `shortId: { unique: true }`，若碰撞則重試生成
- **檢測方式**：MongoDB 唯一索引違反會拋出 `E11000` 錯誤，Controller 中捕獲後重試（最多 3 次）

### 風險 2: accessCode 暴力破解
- **影響範圍**：單一問卷的統計資料洩漏，不影響其他問卷或用戶帳號
- **當前緩解**：6 碼數字（100 萬種組合）+ shortId 組合，破解成本中等
- **未來改進**：
  - 增加 rate limiting（如：同一 IP 每 10 分鐘最多查詢 10 次）
  - 記錄存取日誌（audit log）
  - 提供發起人「重置 accessCode」功能

### 風險 3: 惡意灌票
- **當前狀態**：無防護，同一人可重複填寫
- **影響評估**：對於初期 MVP，先以「信任使用者」為前提
- **未來改進方向**：
  - 記錄填寫者 IP（需隱私政策配合）
  - 前端使用 Device Fingerprint（如 FingerprintJS）
  - 限制單一 IP 對同一問卷的填寫頻率（如：1 小時內最多 3 次）

### 風險 4: 資料庫查詢效能
- **統計查詢複雜度**：需聚合計算各支持程度數量
- **預期量級**：單一問卷回覆 <500 筆，總問卷數 <10,000 筆
- **緩解措施**：
  - 在 `questionnaireResponse.questionnaireId` 建立索引
  - 統計數據可考慮在 `questionnaire` 中冗餘儲存（如 `responseCount`）
  - 若未來量級增長，可引入 Redis 快取統計結果

## Migration Plan

這是全新功能，無需資料遷移，部署步驟：

1. **階段一：安裝相依套件**
   ```bash
   yarn add nanoid@^3.3.7
   ```

2. **階段二：部署程式碼**
   - 新增 Models (`questionnaire.js`, `questionnaireResponse.js`)
   - 新增 Controller (`questionnaireController.js`)
   - 新增 Routes (`questionnaireRoutes.js`)
   - 修改 `index.js` 註冊路由

3. **階段三：驗證索引建立**
   - 確認 MongoDB 已建立 `questionnaire.shortId` 唯一索引
   - 確認 `questionnaireResponse.questionnaireId` 索引

4. **階段四：API 測試**
   - 使用 Postman/Insomnia 測試所有端點
   - 驗證錯誤訊息格式（繁體中文）

5. **階段五：Vercel 部署**
   - Push 到 `main` 分支觸發自動部署
   - 檢查 Vercel logs 確認無錯誤

**Rollback 策略：**
- 若發現重大問題，直接 git revert 相關 commits 並重新部署
- 因為是新功能，rollback 不會影響既有 API 和資料

## Open Questions

1. **是否需要發起人「編輯問卷」功能？**
   - 例如：修改小區名稱、聯絡方式
   - 建議：初期不提供，避免複雜化，可在未來 change 中評估需求

2. **統計頁是否需要「即時更新」？**
   - 當前設計：前端每次刷新重新呼叫 API
   - 替代方案：WebSocket 推送新回覆（過度設計）

3. **是否需要「問卷截止日期」？**
   - 當前：只有 `isActive` 手動啟用/停用
   - 未來可考慮增加 `expiresAt` 欄位自動失效

4. **回覆是否允許「編輯」或「刪除」？**
   - 當前設計：不允許，提交即永久
   - 理由：簡化實作，且問卷意向調查通常不需修改

5. **是否需要記錄填寫時間戳記？**
   - 當前：`questionnaireResponse` 有 `createdAt` (Mongoose timestamps)
   - 可用於未來分析「意向隨時間變化」趨勢
