# Articles API 分頁功能更新

## API 端點
```
GET /api/articles
```

## 分頁參數

| 參數名稱 | 類型 | 預設值 | 說明 |
|---------|------|--------|------|
| pageSize | number | 10 | 每頁資料數量 |
| pageNum | number | 1 | 頁碼（從 1 開始） |

## 其他查詢參數

| 參數名稱 | 類型 | 預設值 | 說明 |
|---------|------|--------|------|
| type | string | 'knowledge' | 文章類型 |
| categoryId | string/array | - | 分類 ID（支援多重篩選） |
| sort | string | '1' | 排序方式：'1' 升序，'-1' 降序 |

## 使用範例

```bash
# 使用預設分頁（第1頁，每頁10筆）
GET /api/articles

# 自訂每頁資料數量
GET /api/articles?pageSize=20

# 指定頁碼
GET /api/articles?pageNum=2

# 同時指定頁碼和每頁數量
GET /api/articles?pageSize=15&pageNum=3

# 結合其他篩選條件
GET /api/articles?pageSize=10&pageNum=1&type=news&categoryId=65a1b2c3d4e5f6789abc

# 多重分類篩選
GET /api/articles?categoryId=65a1b2c3d4e5f6789abc&categoryId=75b2c3d4e5f6789abcde

# 降序排列
GET /api/articles?sort=-1
```

## 回傳格式

```json
{
  "data": [
    {
      "_id": "article-title-slug",
      "id": "generated-uuid",
      "author": "作者名稱",
      "avatar": "作者頭像URL",
      "title": "文章標題",
      "summary": "文章摘要",
      "categoryId": "65a1b2c3d4e5f6789abc",
      "type": "knowledge",
      "content": "文章內容",
      "image": "文章圖片URL",
      "created_at": "2024-01-01T00:00:00.000Z",
      "modified_at": "2024-01-01T00:00:00.000Z",
      "__v": 0
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "total": 150,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## 欄位說明

### data 陣列
包含當前頁面的文章資料，每個文章物件包含：
- `_id`: 文章 ID（基於標題翻譯生成）
- `id`: UUID 格式的文章 ID
- `author`: 作者名稱
- `avatar`: 作者頭像 URL
- `title`: 文章標題
- `summary`: 文章摘要
- `categoryId`: 分類 ID（關聯 Category 模型）
- `type`: 文章類型
- `content`: 文章內容
- `image`: 文章圖片 URL
- `created_at`: 建立時間
- `modified_at`: 修改時間

### pagination 物件
- `currentPage`: 當前頁碼
- `pageSize`: 每頁資料數量
- `total`: 總文章數量
- `totalPages`: 總頁數
- `hasNextPage`: 是否有下一頁
- `hasPreviousPage`: 是否有上一頁

## 向下相容性

- 不傳入任何分頁參數時，API 使用預設值（第1頁，每頁10筆）
- 回傳格式新增 `pagination` 物件，原有的 `data` 陣列保持不變
- 現有前端代碼可以直接使用 `response.data` 取得文章資料

## 前端建議實作

### Vue.js 範例
```javascript
// 基本使用
const fetchArticles = async (pageNum = 1, pageSize = 10) => {
  const response = await fetch(`/api/articles?pageNum=${pageNum}&pageSize=${pageSize}`);
  const result = await response.json();
  return result;
};

// 使用分頁功能
const { data: articles, pagination } = await fetchArticles(2, 15);
console.log(articles); // 當前頁文章資料
console.log(pagination.hasNextPage); // 是否有下一頁
```

### React 範例
```javascript
const [articles, setArticles] = useState([]);
const [pagination, setPagination] = useState({});

const loadArticles = async (pageNum = 1, pageSize = 10) => {
  const response = await fetch(`/api/articles?pageNum=${pageNum}&pageSize=${pageSize}`);
  const { data, pagination } = await response.json();
  
  setArticles(data);
  setPagination(pagination);
};

// 載入下一頁
const loadNextPage = () => {
  if (pagination.hasNextPage) {
    loadArticles(pagination.currentPage + 1, pagination.pageSize);
  }
};
```

## 效能最佳化建議

1. **適當的頁面大小**：建議每頁 10-50 筆資料，避免一次載入過多資料
2. **無限滾動**：可以使用 `hasNextPage` 判斷是否載入更多資料
3. **快取機制**：前端可以快取已載入的頁面資料，減少重複請求
4. **預載入**：可以預先載入下一頁資料，提升使用者體驗

## 錯誤處理

```json
{
  "error": "Internal Server Error"
}
```

HTTP 狀態碼：
- `200`: 成功
- `500`: 伺服器內部錯誤