const mongoose = require('mongoose');

const IndicatorSchema = new mongoose.Schema({
  index: { type: Number, required: true },
  date: { type: String, required: true }, // 格式範例：113/1
  value: { type: Number, required: true },
});

IndicatorSchema.index({ index: 1, date: 1 }, { unique: true }); // 保證 index + date 不重複

module.exports = mongoose.model('indicator', IndicatorSchema);
