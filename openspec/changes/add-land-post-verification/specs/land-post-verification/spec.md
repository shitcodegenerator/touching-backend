## ADDED Requirements

### Requirement: 管理員可在核准時設定官方核實結果

系統 SHALL 允許已驗證的管理員於核准待審土地案件時，分別設定地號與委託／授權書是否已由平台核實。核准代表案件基本資料已確認可上架；兩項核實結果 MUST 是可獨立選擇的附加狀態。

#### Scenario: 核准並核實其中一項資料

- **WHEN** 管理員核准待審案件，且將 `landNumberVerified` 設為 true、`authorizationLetterVerified` 設為 false
- **THEN** 案件狀態為 approved、兩項值依請求保存，且新增含操作者帳號與時間的 approved 紀錄

### Requirement: 管理員可修改已核准案件的官方核實結果

系統 SHALL 僅允許已驗證管理員修改已核准土地案件的兩項官方核實結果，且 MUST 不改變案件的核准狀態。

#### Scenario: 撤銷既有的地號核實

- **WHEN** 管理員將已核准案件的 `landNumberVerified` 從 true 改為 false
- **THEN** 案件維持 approved，且新增紀錄原值、新值、操作者帳號與時間的 verification_updated 紀錄

#### Scenario: 嘗試修改非已核准案件

- **WHEN** 管理員嘗試修改 pending 或 rejected 案件的官方核實結果
- **THEN** 系統 MUST 拒絕請求並回傳明確的 400 錯誤，不寫入任何資料或紀錄

### Requirement: 官方核實資料與投稿者自述相互獨立

系統 SHALL 將平台的 `authorizationLetterVerified` 與投稿者自述的 `hasAuthorizationLetter` 視為不同欄位，且不得由任一方覆蓋另一方。

#### Scenario: 投稿者自述有文件但平台未核實

- **WHEN** 案件 `hasAuthorizationLetter` 為 true、`authorizationLetterVerified` 為 false
- **THEN** API MUST 同時保留兩個不同值，供使用端以不同文案呈現

### Requirement: 公開資料不洩漏內部操作紀錄

系統 SHALL 在公開土地案件列表與詳情 API 提供兩項官方核實 Boolean，但 MUST 不回傳任何操作紀錄、管理員 ID 或管理員帳號。

#### Scenario: 讀取公開案件詳情

- **WHEN** 未登入使用者取得公開案件的資料
- **THEN** 回應可包含 landNumberVerified 與 authorizationLetterVerified，但不得包含 reviewLogs 或 operator 資料
