const createRateLimit = require('./simpleRateLimit');

// General API rate limit
const generalLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  message: {
    data: false,
    message: '請求過於頻繁，請稍後再試'
  }
});

// Stricter rate limit for authentication endpoints
const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // limit each IP to 5 requests per windowMs
  message: {
    data: false,
    message: '認證請求過於頻繁，請15分鐘後再試'
  }
});

// Password reset rate limit
const passwordResetLimiter = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // limit each IP to 3 password reset requests per hour
  message: {
    data: false,
    message: '密碼重設請求過於頻繁，請1小時後再試'
  }
});

// File upload rate limit
const uploadLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // limit each IP to 10 uploads per windowMs
  message: {
    data: false,
    message: '檔案上傳過於頻繁，請稍後再試'
  }
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter
};