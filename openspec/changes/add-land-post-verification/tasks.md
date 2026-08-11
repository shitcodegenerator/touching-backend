## 1. Backend data and API

- [ ] 1.1 擴充 LandPost schema 的兩項核實 Boolean 與 reviewLogs 子文件。
- [ ] 1.2 擴充管理員核准端點以接收、驗證與記錄初始核實值。
- [ ] 1.3 新增已核准案件的核實狀態更新端點與操作紀錄。
- [ ] 1.4 將公開查詢欄位加入核實 Boolean，並確認不回傳 reviewLogs。

## 2. Consumers

- [ ] 2.1 touching-admin 實作核准勾選、已核准案件編輯與紀錄呈現。
- [ ] 2.2 touching-development 實作公開列表與詳情頁的官方核實標章。

## 3. Verification

- [ ] 3.1 驗證 API 權限、狀態邊界、歷程完整性與公開資料最小揭露。
- [ ] 3.2 驗證後台核准與編輯流程，以及前台兩項標章顯示。
