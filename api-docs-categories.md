# Categories API 分頁功能更新

## API 端點
```
GET /api/categories
```

## 新增參數

| 參數名稱 | 類型 | 預設值 | 說明 |
|---------|------|--------|------|
| pageSize | number | 10 | 每頁資料數量 |
| pageNum | number | 1 | 頁碼（從 1 開始） |

## 使用範例

```bash
# 使用預設分頁（第1頁，每頁10筆）
GET /api/categories

# 自訂每頁資料數量
GET /api/categories?pageSize=20

# 指定頁碼
GET /api/categories?pageNum=2

# 同時指定頁碼和每頁數量
GET /api/categories?pageSize=15&pageNum=3
```

## 回傳格式

```json
{
  "data": [
    {
      "_id": "category_id",
      "title": "分類名稱",
      "__v": 0
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalPages": 3
  }
}
```

## 欄位說明

### data 陣列
- 包含當前頁面的分類資料
- 格式與原有 API 相同，確保向下相容

### pagination 物件
- `currentPage`: 當前頁碼
- `pageSize`: 每頁資料數量
- `totalPages`: 總頁數

## 向下相容性

- 不傳入任何分頁參數時，API 仍會正常運作
- 原有的前端代碼可以直接使用 `response.data` 取得分類資料
- 新增的 `pagination` 物件可選擇性使用

## 前端建議實作

```javascript
// 基本使用（向下相容）
const response = await fetch('/api/categories');
const { data } = await response.json();
console.log(data); // 分類陣列

// 使用分頁功能
const response = await fetch('/api/categories?pageSize=20&pageNum=2');
const { data, pagination } = await response.json();
console.log(data); // 當前頁分類資料
console.log(pagination); // 分頁資訊
```