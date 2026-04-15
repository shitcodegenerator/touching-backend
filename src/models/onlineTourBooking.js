const mongoose = require('mongoose');

const OnlineTourBookingSchema = new mongoose.Schema({
  // 基本資料欄位
  name: {
    type: String,
    required: [true, '姓名為必填項目'],
    trim: true,
    minlength: [2, '姓名至少需要2個字元'],
    maxlength: [30, '姓名不能超過30個字元']
  },
  gender: {
    type: String,
    required: [true, '性別為必填項目'],
    enum: {
      values: ['男', '女', '不便透露'],
      message: '性別只能選擇：男、女、不便透露'
    }
  },
  phone: {
    type: String,
    required: [true, '手機號碼為必填項目'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^09\d{8}$/.test(v);
      },
      message: '手機號碼格式不正確，請輸入09開頭的10位數字'
    },
    index: true // 用於重複檢查
  },
  email: {
    type: String,
    trim: true,
    default: '',
    validate: {
      validator: function(v) {
        // 如果有輸入email，則驗證格式；空字串則不驗證
        if (!v || v === '') return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email格式不正確'
    }
  },

  // UTM 追蹤參數
  utm_source: { type: String, default: '', trim: true },
  utm_medium: { type: String, default: '', trim: true },
  utm_campaign: { type: String, default: '', trim: true },

  // 其他追蹤資訊
  referrer: { type: String, default: '', trim: true },
  user_agent: { type: String, default: '', trim: true },
  page_url: { type: String, default: '', trim: true },
  ip_address: { type: String, default: '', trim: true },

  // 聯繫偏好
  preferred_contact_time: {
    type: String,
    enum: {
      values: ['上午9-12', '中午12-2', '下午2-5', '晚上6-10', '都方便'],
      message: '聯繫時段只能選擇：上午9-12、中午12-2、下午2-5、晚上6-10、都方便'
    },
    default: '中午12-2'
  },

  // 狀態管理
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },

  // 時間戳記
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// 建立複合索引用於重複提交檢查（24小時內同手機號碼）
OnlineTourBookingSchema.index({ phone: 1, created_at: 1 });

// 更新時自動設定 updated_at
OnlineTourBookingSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updated_at = new Date();
  }
  next();
});

// 靜態方法：檢查重複提交（24小時內）
OnlineTourBookingSchema.statics.checkDuplicateSubmission = async function(phone) {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const existingBooking = await this.findOne({
    phone: phone,
    created_at: { $gte: twentyFourHoursAgo },
    status: { $ne: 'cancelled' } // 不包含已取消的預約
  });

  return !!existingBooking;
};

// 實例方法：產生預約ID
OnlineTourBookingSchema.methods.generateBookingId = function() {
  const timestamp = this.created_at.getTime().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `OTB${timestamp}${randomStr}`.toUpperCase();
};

module.exports = mongoose.model('OnlineTourBooking', OnlineTourBookingSchema);