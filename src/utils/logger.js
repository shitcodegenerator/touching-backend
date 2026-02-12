const winston = require('winston');
const path = require('path');

// 創建日誌目錄
const logDir = 'logs';
require('fs').mkdirSync(logDir, { recursive: true });

// 自定義日誌格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ' ' + JSON.stringify(meta);
    }
    
    if (stack) {
      log += '\n' + stack;
    }
    
    return log;
  })
);

// 創建 Winston Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'touching-backend' },
  transports: [
    // 錯誤日誌（只記錄 error 等級）
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 組合日誌（記錄所有等級）
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // 安全事件日誌
    new winston.transports.File({
      filename: path.join(logDir, 'security.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
});

// 開發環境添加控制台輸出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 生產環境錯誤處理
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
  );
  
  logger.rejections.handle(
    new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
  );
}

// 日誌輔助函數
const loggerUtils = {
  // API 請求日誌
  logRequest: (req, res, responseTime) => {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.userData?.userId || 'anonymous',
      requestId: req.id
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request Failed', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
  },
  
  // 安全事件日誌
  logSecurityEvent: (event, details, req = null) => {
    const logData = {
      event,
      ...details,
      ...(req && {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.userData?.userId
      }),
      timestamp: new Date().toISOString()
    };
    
    logger.warn('Security Event', logData);
  },
  
  // 業務事件日誌
  logBusinessEvent: (event, details) => {
    logger.info('Business Event', { event, ...details });
  },
  
  // 錯誤日誌
  logError: (error, context = {}) => {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }
};

module.exports = { logger, loggerUtils };