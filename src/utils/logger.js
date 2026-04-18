const winston = require('winston');

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

// 創建 Winston Logger - 只使用 Console transport
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'touching-backend' },
  transports: [
    // 所有環境都使用 Console transport
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? logFormat
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
    })
  ],
});

// 在 Vercel/Serverless 環境中，檔案系統是只讀的
// 因此只使用 Console transport，日誌會被 Vercel 自動收集

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