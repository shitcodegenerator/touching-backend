const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'member', required: true }, // 關聯發問會員
  type: { type: Number, required: true }, // 問題類型
  content: { type: String, required: true, maxlength: 400 }, // 問題內容（限制 400 字）
  created_at: { type: Date, default: Date.now }, // 發問時間
  isResponded: { type: Boolean, default: false }, // 問題狀態
  response: {
    content: { type: String, default: '' }, // 管理員回應內容
    response_at: { type: Date, default: null }, // 回應時間
  },
  displayName:{ type: String, default: null }
});

module.exports = Question = mongoose.model("question", QuestionSchema);
