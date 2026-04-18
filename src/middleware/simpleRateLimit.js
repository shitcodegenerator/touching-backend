/**
 * 簡單的頻率限制中間件
 * 使用內存存儲來跟蹤請求頻率
 */

const requests = new Map();

// 清理過期記錄的函數
function cleanupExpiredRecords() {
  const now = Date.now();
  for (const [key, data] of requests.entries()) {
    if (now - data.resetTime > 0) {
      requests.delete(key);
    }
  }
}

// 每分鐘清理一次過期記錄
setInterval(cleanupExpiredRecords, 60 * 1000);

/**
 * 建立頻率限制中間件
 * @param {Object} options 配置選項
 * @param {number} options.windowMs 時間窗口（毫秒）
 * @param {number} options.limit 限制次數
 * @param {Object} options.message 錯誤訊息
 * @returns {Function} Express 中間件
 */
let limiterCounter = 0;

function createRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 預設 15 分鐘
    limit = 5, // 預設 5 次請求
    message = {
      success: false,
      message: "請求過於頻繁，請稍後再試",
      errors: [],
    },
  } = options;

  // 每個 limiter 實例使用獨立的 prefix，避免不同 limiter 共用同一個 key
  const prefix = `rate_limit_${limiterCounter++}`;

  return (req, res, next) => {
    // 獲取客戶端 IP，優先使用 x-forwarded-for
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);

    if (!clientIp) {
      // 如果無法獲取 IP，允許請求通過
      return next();
    }

    const now = Date.now();
    const key = `${prefix}:${clientIp}`;

    // 獲取或創建該 IP 的請求記錄
    let record = requests.get(key);

    if (!record) {
      // 新的 IP，初始化記錄
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      requests.set(key, record);
      return next();
    }

    // 檢查時間窗口是否已過期
    if (now > record.resetTime) {
      // 重置計數器
      record.count = 1;
      record.resetTime = now + windowMs;
      requests.set(key, record);
      return next();
    }

    // 增加請求計數
    record.count++;

    // 檢查是否超過限制
    if (record.count > limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      // 設置頭部信息
      res.set({
        "X-RateLimit-Limit": limit,
        "X-RateLimit-Remaining": 0,
        "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
        "Retry-After": retryAfter,
      });

      return res.status(429).json({
        ...message,
        retryAfter,
      });
    }

    // 設置頭部信息
    res.set({
      "X-RateLimit-Limit": limit,
      "X-RateLimit-Remaining": limit - record.count,
      "X-RateLimit-Reset": new Date(record.resetTime).toISOString(),
    });

    next();
  };
}

module.exports = createRateLimit;
