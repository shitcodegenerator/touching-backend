# Security & Performance Audit - Design Document

## Architecture Overview

本設計文件詳述如何系統性地解決「踏取國際開發」後端 API 服務的安全性與效能問題。

## Security Hardening Design

### 1. Sensitive Data Management

**Current State**
```javascript
// ❌ 硬編碼在 authController.js
client_secret: "076a9cddc12b1ea0e7fe0bc2a1de7281"

// ❌ 硬編碼在 .env 檔案中
DRIVE_KEY=-----BEGIN PRIVATE KEY-----\nMII...
```

**Target Design**
```javascript
// ✅ 使用環境變數
client_secret: process.env.LINE_CLIENT_SECRET

// ✅ 使用加密的 secrets management
const googleDriveCredentials = await secretManager.getSecret('google-drive-key');
```

**Implementation Strategy**
- 建立 `src/config/secrets.js` 統一管理敏感資料
- 使用 AWS Secrets Manager 或 Azure Key Vault
- 實作 secrets rotation 機制

### 2. JWT Token Security

**Current Issues**
- Facebook 登入將 secret 暴露在 JWT payload
- 缺乏 refresh token 機制
- 固定 7 天過期無彈性

**Target Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │    │   Auth Service   │    │  Token Store    │
│                 │    │                  │    │   (Redis)       │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Access Token    │◄───│ JWT Generation   │    │ Refresh Tokens  │
│ (15 min)        │    │                  │    │ (30 days)       │
│                 │    │ Token Validation │◄───│ Token Blacklist │
│ Refresh Token   │───►│                  │    │                 │
│ (30 days)       │    │ Token Refresh    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Security Enhancements**
- Access Token 縮短至 15 分鐘
- 實作 Refresh Token 機制
- 加入 Token Blacklist 功能
- JWT payload 移除敏感資料

### 3. Input Validation Framework

**Design Pattern**
```javascript
// ✅ 統一驗證中介層
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        data: false,
        message: '輸入格式錯誤',
        errors: error.details
      });
    }
    next();
  };
};

// ✅ 使用 Joi 進行結構化驗證
const questionnaireSchema = Joi.object({
  initiatorName: Joi.string().min(1).max(50).required(),
  phone: Joi.string().pattern(/^09\d{8}$/).optional(),
  lineId: Joi.string().min(1).max(100).optional()
});
```

## Performance Optimization Design

### 1. Database Optimization Strategy

**Index Strategy**
```javascript
// ✅ 複合索引優化
// questionnaire collection
{ shortId: 1 }  // 唯一索引
{ createdAt: -1 }  // 排序查詢

// questionnaireResponse collection  
{ questionnaireId: 1, createdAt: -1 }  // 複合索引
{ supportLevel: 1 }  // 聚合查詢
```

**Query Optimization**
```javascript
// ❌ N+1 查詢問題
questionnaires.map(async (q) => {
  const totalResponses = await QuestionnaireResponse.countDocuments({
    questionnaireId: q._id
  });
});

// ✅ 聚合查詢優化
const questionnairesWithStats = await Questionnaire.aggregate([
  {
    $lookup: {
      from: 'questionnaireresponses',
      localField: '_id',
      foreignField: 'questionnaireId',
      as: 'responses'
    }
  },
  {
    $addFields: {
      totalResponses: { $size: '$responses' }
    }
  }
]);
```

### 2. Caching Architecture

**Multi-Layer Caching**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │   Redis Cache    │    │   Database      │
│   Memory        │    │   (L2 Cache)     │    │   (L3)          │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Config Data     │    │ User Sessions    │    │ Master Data     │
│ Indicators      │    │ API Responses    │    │ Transactional   │
│ (5 min TTL)     │    │ (15 min TTL)     │    │ Data            │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Cache Strategy**
- **Application Memory**: 經濟指標資料（5分鐘TTL）
- **Redis L2**: API 回應快取（15分鐘TTL）
- **Database L3**: 主要資料儲存

### 3. Email Service Optimization

**Current Issue**: 同步發送造成 API 回應延遲

**Target Architecture**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Endpoint  │    │   Message Queue  │    │  Email Worker   │
│                 │    │   (Bull Queue)   │    │                 │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ Quick Response  │───►│ Email Jobs       │───►│ Async Processing│
│ (< 100ms)       │    │ - Retry Logic    │    │ - Error Handling│
│                 │    │ - Rate Limiting  │    │ - Dead Letter   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Code Quality Framework

### 1. Error Handling Standardization

**Current State**: 不一致的錯誤處理

**Target Pattern**
```javascript
// ✅ 統一錯誤處理中介層
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || '系統錯誤，請稍後再試';
  
  // 記錄錯誤（非 4xx）
  if (statusCode >= 500) {
    logger.error('Internal server error', { 
      error: err.stack,
      url: req.url,
      method: req.method,
      userId: req.userData?.userId
    });
  }
  
  res.status(statusCode).json({
    data: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### 2. Logging System

**Target Structure**
```
logs/
├── app.log          # 一般應用程式日誌
├── error.log        # 錯誤日誌
├── access.log       # API 存取日誌
└── security.log     # 安全事件日誌
```

**Log Levels & Content**
- **ERROR**: 系統錯誤、認證失敗
- **WARN**: 效能警告、不尋常行為
- **INFO**: 重要業務事件
- **DEBUG**: 開發除錯資訊

## Migration Strategy

### Phase 1: Security Fixes (Week 1)
1. 移除硬編碼機密
2. 實作環境變數管理
3. 修復 JWT 安全問題

### Phase 2: Performance (Week 2-3)
1. 資料庫索引優化
2. 實作快取機制
3. Email 佇列系統

### Phase 3: Code Quality (Week 4)
1. 錯誤處理統一化
2. 日誌系統建立
3. 程式碼清理與重構

## Risk Mitigation

### Deployment Risks
- **Blue-Green Deployment**: 確保無停機更新
- **Database Migration**: 分階段進行，確保資料完整性
- **Rollback Plan**: 每個階段都有回復機制

### Security Risks
- **Secret Rotation**: 分批更新，避免服務中斷
- **JWT Migration**: 漸進式更新，向下相容
- **Access Control**: 測試環境先行驗證

### Performance Risks
- **Cache Warming**: 部署後立即預熱快取
- **Database Load**: 監控查詢效能，必要時調整
- **Queue Processing**: 監控佇列積壓，調整工作者數量