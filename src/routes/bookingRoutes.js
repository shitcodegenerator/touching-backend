const express = require('express');
const router = express.Router();
const createRateLimit = require('../middleware/simpleRateLimit');
const bookingController = require('../controllers/bookingController');
const authenticate = require('../middleware/authenticate');
const authenticateAdmin = require('../middleware/authenticateAdmin');

// 專用於預約表單的頻率限制 - 15分鐘5次
const bookingLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  limit: 5, // 每個IP在15分鐘內最多5次預約請求
  message: {
    success: false,
    message: '預約請求過於頻繁，請15分鐘後再試',
    errors: []
  }
});

// 更嚴格的重複提交檢查 - 1分鐘2次
const strictBookingLimiter = createRateLimit({
  windowMs: 60 * 1000, // 1分鐘
  limit: 2, // 每個IP在1分鐘內最多2次預約請求
  message: {
    success: false,
    message: '請求過於頻繁，請稍候再試',
    errors: []
  }
});

/**
 * @route   POST /api/booking/online-tour
 * @desc    建立線上預約賞屋
 * @access  Public
 */
router.post('/online-tour',
  strictBookingLimiter,
  bookingLimiter,
  bookingController.createOnlineTourBooking
);

/**
 * @route   GET /api/booking/online-tour
 * @desc    取得預約列表（管理後台使用）
 * @access  Admin only
 */
router.get('/online-tour',
  authenticate,
  authenticateAdmin,
  bookingController.getBookingList
);

/**
 * @route   PUT /api/booking/online-tour/:id/status
 * @desc    更新預約狀態（管理後台使用）
 * @access  Admin only
 */
router.put('/online-tour/:id/status',
  authenticate,
  authenticateAdmin,
  bookingController.updateBookingStatus
);

// 基本的健康檢查端點
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Booking service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;