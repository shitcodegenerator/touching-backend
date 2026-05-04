const mongoose = require("mongoose");

const IndicatorV2Schema = new mongoose.Schema({
  index: { type: Number, required: true },
  key: { type: String, required: true },
  date: { type: String, required: true },
  value: { type: Number, required: true },
});

IndicatorV2Schema.index({ index: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("indicator_v2", IndicatorV2Schema);
