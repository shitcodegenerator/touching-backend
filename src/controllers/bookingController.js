const OnlineTourBooking = require("../models/onlineTourBooking.js");
const { sendSuccess, sendError } = require("../utils/response.js");
const { loggerUtils } = require("../utils/logger.js");
const Joi = require("joi");
const nodemailer = require("nodemailer");

// 輸入資料驗證規則
const bookingValidationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(30).required().messages({
    "string.empty": "姓名為必填項目",
    "string.min": "姓名至少需要2個字元",
    "string.max": "姓名不能超過30個字元",
    "any.required": "姓名為必填項目",
  }),
  gender: Joi.string().valid("男", "女", "不便透露").required().messages({
    "any.only": "性別只能選擇：男、女、不便透露",
    "any.required": "性別為必填項目",
  }),
  phone: Joi.string()
    .pattern(/^09\d{8}$/)
    .required()
    .messages({
      "string.pattern.base": "手機號碼格式不正確，請輸入09開頭的10位數字",
      "any.required": "手機號碼為必填項目",
    }),
  email: Joi.string().email().allow("").optional().messages({
    "string.email": "Email格式不正確",
  }),
  utm_source: Joi.string().allow("").optional(),
  utm_medium: Joi.string().allow("").optional(),
  utm_campaign: Joi.string().allow("").optional(),
  referrer: Joi.string().allow("").optional(),
  user_agent: Joi.string().allow("").optional(),
  page_url: Joi.string().allow("").optional(),
  source: Joi.string().allow("").optional(),
  campaign: Joi.string().allow("").optional(),
  page_type: Joi.string().allow("").optional(),
  timestamp: Joi.string().allow("").optional(),
  utm_content: Joi.string().allow("").optional(),
  preferred_contact_time: Joi.string()
    .valid("上午9-12", "中午12-2", "下午2-5", "晚上6-10", "都方便")
    .default("中午12-2")
    .optional()
    .messages({
      "any.only":
        "聯繫時段只能選擇：上午9-12、中午12-2、下午2-5、晚上6-10、都方便",
    }),
});

/**
 * 建立線上預約賞屋
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const createOnlineTourBooking = async (req, res) => {
  try {
    // 資料驗證
    const { error, value } = bookingValidationSchema.validate(req.body);
    if (error) {
      const errorMessage = error.details[0].message;
      loggerUtils.logSecurityEvent(
        "Invalid booking data",
        {
          error: errorMessage,
          body: req.body,
        },
        req,
      );
      return sendError(res, errorMessage, 400);
    }

    const {
      name,
      gender,
      phone,
      email,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      user_agent,
      page_url,
      preferred_contact_time,
    } = value;

    // 檢查重複提交（24小時內同手機號碼）
    const isDuplicate = await OnlineTourBooking.checkDuplicateSubmission(phone);
    if (isDuplicate) {
      loggerUtils.logSecurityEvent(
        "Duplicate booking submission",
        {
          phone: phone.substring(0, 6) + "****", // 部分遮蔽手機號碼
          ip: req.ip,
        },
        req,
      );
      return sendError(
        res,
        "您的手機號碼在24小時內已有預約記錄，如需修改或重新預約，請聯繫客服。",
        409,
      );
    }

    // 取得用戶IP位址
    const ip_address =
      req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

    // 建立新的預約記錄
    const newBooking = new OnlineTourBooking({
      name: sanitizeInput(name),
      gender,
      phone,
      email: sanitizeInput(email || ""),
      utm_source: sanitizeInput(utm_source || ""),
      utm_medium: sanitizeInput(utm_medium || ""),
      utm_campaign: sanitizeInput(utm_campaign || ""),
      referrer: sanitizeInput(referrer || ""),
      user_agent: sanitizeInput(user_agent || req.get("User-Agent") || ""),
      page_url: sanitizeInput(page_url || ""),
      ip_address: ip_address,
      preferred_contact_time: preferred_contact_time || "中午12-2",
    });

    // 儲存到資料庫
    await newBooking.save();

    // 產生預約ID
    const bookingId = newBooking.generateBookingId();

    // Fire-and-forget: 寄送 Email 通知
    sendBookingNotificationEmail(newBooking).catch((err) => {
      loggerUtils.logError(err, {
        context: "Booking notification email failed",
        bookingId: newBooking._id,
      });
    });

    // 記錄業務事件
    loggerUtils.logBusinessEvent("Online tour booking created", {
      bookingId: newBooking._id,
      phone: phone.substring(0, 6) + "****", // 部分遮蔽手機號碼
      utm_source,
      utm_medium,
      utm_campaign,
      ip_address,
    });

    // 回傳成功結果
    return res.status(200).json({
      success: true,
      message: "預約資料已送出",
      booking_id: bookingId,
    });
  } catch (error) {
    // 記錄錯誤
    loggerUtils.logError(error, {
      endpoint: "/api/booking/online-tour",
      method: "POST",
      ip: req.ip,
      body: req.body,
    });

    console.error("Online tour booking error:", error);
    return sendError(
      res,
      "系統暫時無法處理您的預約，請稍後再試或聯繫客服。",
      500,
    );
  }
};

/**
 * 取得預約列表（管理後台使用）
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getBookingList = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 建立查詢條件
    const query = {};
    if (status) {
      query.status = status;
    }
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) {
        query.created_at.$gte = new Date(startDate);
      }
      if (endDate) {
        query.created_at.$lte = new Date(endDate);
      }
    }

    // 執行查詢
    const [bookings, total] = await Promise.all([
      OnlineTourBooking.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select("-ip_address -user_agent") // 隱藏敏感資訊
        .lean(),
      OnlineTourBooking.countDocuments(query),
    ]);

    // 計算分頁資訊
    const totalPages = Math.ceil(total / parseInt(limit));

    const meta = {
      currentPage: parseInt(page),
      totalPages,
      totalItems: total,
      itemsPerPage: parseInt(limit),
      hasNext: parseInt(page) < totalPages,
      hasPrev: parseInt(page) > 1,
    };

    return sendSuccess(res, bookings, 200, meta);
  } catch (error) {
    loggerUtils.logError(error, {
      endpoint: "/api/booking/online-tour",
      method: "GET",
      query: req.query,
    });

    console.error("Get booking list error:", error);
    return sendError(res, "無法取得預約列表", 500);
  }
};

/**
 * 更新預約狀態（管理後台使用）
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 驗證狀態值
    const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return sendError(res, "無效的狀態值", 400);
    }

    // 更新預約狀態
    const updatedBooking = await OnlineTourBooking.findByIdAndUpdate(
      id,
      { status, updated_at: new Date() },
      { new: true, runValidators: true },
    );

    if (!updatedBooking) {
      return sendError(res, "找不到指定的預約記錄", 404);
    }

    // 記錄業務事件
    loggerUtils.logBusinessEvent("Booking status updated", {
      bookingId: id,
      oldStatus: updatedBooking.status,
      newStatus: status,
      updatedBy: req.userData?.userId || "system",
    });

    return sendSuccess(res, updatedBooking);
  } catch (error) {
    loggerUtils.logError(error, {
      endpoint: `/api/booking/online-tour/${req.params.id}`,
      method: "PUT",
      body: req.body,
    });

    console.error("Update booking status error:", error);
    return sendError(res, "無法更新預約狀態", 500);
  }
};

/**
 * 輸入資料清理函式
 * @param {string} input - 要清理的輸入字串
 * @returns {string} - 清理後的字串
 */
function sanitizeInput(input) {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // 移除 script 標籤
    .replace(/<[^>]+>/g, "") // 移除 HTML 標籤
    .replace(/[<>&"']/g, function (match) {
      // 編碼特殊字符
      const map = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#x27;",
      };
      return map[match];
    });
}

/**
 * 寄送預約通知 Email 給管理員
 * @param {Object} booking - 預約記錄
 */
async function sendBookingNotificationEmail(booking) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "touchingdevelopment.service@gmail.com",
      pass: process.env.GMAIL_PASSWORD,
    },
  });

  const createdAt = new Date(booking.created_at).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
  });

  const mailOptions = {
    from: "踏取國際開發有限公司 <touchingdevelopment.service@gmail.com>",
    to: "dontz3210@gmail.com",
    subject: `【新預約通知】${booking.name} 預約線上賞屋`,
    html: `
      <div style="font-family: 'Microsoft JhengHei', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">📋 新的線上賞屋預約</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; width: 120px; border: 1px solid #dee2e6;">姓名</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${booking.name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">性別</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${booking.gender}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">手機</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${booking.phone}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">Email</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${booking.email || "未提供"}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">方便聯繫時段</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${booking.preferred_contact_time}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">來源頁面</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${booking.page_url || "未提供"}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">UTM 來源</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${booking.utm_source || "-"} / ${booking.utm_medium || "-"} / ${booking.utm_campaign || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 10px 15px; font-weight: bold; border: 1px solid #dee2e6;">預約時間</td>
            <td style="padding: 10px 15px; border: 1px solid #dee2e6;">${createdAt}</td>
          </tr>
        </table>
        <p style="color: #7f8c8d; font-size: 12px; margin-top: 20px;">此為系統自動通知信，請盡快聯繫客戶。</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = {
  createOnlineTourBooking,
  getBookingList,
  updateBookingStatus,
};
