## Why

目前土地案件的「核准」只表示案件可上架，無法讓平台公開說明特定地號或委託／授權書已經過審核人員核實，也沒有可稽核的核實異動歷程。

## What Changes

- LandPost 新增地號與委託／授權書兩項平台核實狀態，以及案件內的審核／核實操作紀錄。
- 管理員核准 API 可一併接收初始核實值；另提供僅限已核准案件的核實狀態更新 API。
- 管理員操作記錄操作者帳號與時間，公開 API 僅暴露核實狀態、不暴露內部紀錄。

## Impact

- Affected specs: `land-post-verification`（新增）
- Affected code: `src/models/landPost.js`、`src/controllers/landPostController.js`、`src/routes/landPostRoutes.js`
- Consumers: `touching-admin` 核准流程與 `touching-development` 公開案件呈現
