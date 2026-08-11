## Context

平台核准案件代表審核人員已與投稿方聯絡並確認基本資訊。地號與委託／授權書需要獨立的、可撤銷的官方核實狀態；每次審核或核實異動必須保留操作者與時間。

## Goals / Non-Goals

- Goals: 保存兩項官方核實結果、支援已核准案件修改、提供可稽核的案件內操作歷程、保障公開資料不洩漏內部帳號。
- Non-Goals: 不保存證明文件、不建立全系統操作紀錄頁、不改變投稿者自述 `hasAuthorizationLetter`。

## Decisions

### 將核實狀態與紀錄嵌入 LandPost

在 LandPost 加入 `landNumberVerified`、`authorizationLetterVerified` 兩個預設 `false` 的 Boolean 與 `reviewLogs` 陣列。紀錄以案件為查閱單位、資料量小、每次案件詳情一次讀取即可取得，故不建立獨立 collection。

### 管理員帳號採不可變更快照

每筆紀錄保存 `operator.userId` 與 `operator.username`。兩值取自 `authenticateAdmin` 已驗證的 JWT payload；即使帳號日後變動，歷程仍能反映操作當下的帳號。

### 更新端點維持狀態邊界

核准端點接收初始值；`PATCH /admin/:id/verification` 只允許已核准案件更新，更新不會變更 status。後端先比較前後值，只有異動才寫入 `verification_updated` 紀錄。

### 公開資料採白名單

公開列表與詳情選擇欄位中加入兩個 Boolean，但絕不包含 `reviewLogs`。管理員列表維持完整回傳，以供後台顯示歷程。

## Risks / Trade-offs

- 將紀錄嵌入案件會讓單一文件成長；每次核實只有一筆極小紀錄，且無跨案件分析需求，風險可接受。
- 目前管理員模型僅有 username，紀錄將顯示帳號而非人名；如未來需要人名，再另行擴充帳號設定。

## Migration Plan

Mongoose 預設值使所有既有案件視為未核實；無須批次資料遷移。部署後先驗證公開 API 不回傳內部紀錄，再開放後台核實操作。

## Open Questions

無。
