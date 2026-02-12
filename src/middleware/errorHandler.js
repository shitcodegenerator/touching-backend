// 自定義錯誤類別
class CustomError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 特定錯誤類別
class ValidationError extends CustomError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class AuthenticationError extends CustomError {
  constructor(message = '認證失败') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends CustomError {
  constructor(message = '權限不足') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends CustomError {
  constructor(message = '資源不存在') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends CustomError {
  constructor(message = '資源衝突') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

// 統一錯誤處理中間件
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 生成唯一請求ID（如果不存在）
  const requestId = req.id || Date.now().toString();

  // MongoDB 錯誤處理
  if (err.name === 'CastError') {
    const message = '資源不存在';
    error = new NotFoundError(message);
  }

  if (err.code === 11000) {
    const message = '資料已存在';
    error = new ConflictError(message);
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ValidationError(message);
  }

  // JWT 錯誤處理
  if (err.name === 'JsonWebTokenError') {
    const message = '認證令牌無效';
    error = new AuthenticationError(message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = '認證令牌已過期';
    error = new AuthenticationError(message);
  }

  // 記錄錯誤
  if (!error.isOperational || error.statusCode >= 500) {
    console.error('系統錯誤:', {
      requestId,
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.userData?.userId,
      timestamp: new Date().toISOString()
    });
  }

  // 構建錯誤回應
  const errorResponse = {
    success: false,
    error: {
      message: error.message || '服務器內部錯誤',
      ...(error.code && { code: error.code }),
      requestId
    },
    timestamp: new Date().toISOString()
  };

  // 開發環境包含堆疊追蹤
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
  }

  res.status(error.statusCode || 500).json(errorResponse);
};

// 處理未捕獲的路由
const notFound = (req, res, next) => {
  const error = new NotFoundError(`路由 ${req.originalUrl} 不存在`);
  next(error);
};

module.exports = {
  CustomError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  errorHandler,
  notFound
};