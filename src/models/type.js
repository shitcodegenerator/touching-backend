const mongoose = require('mongoose');

const TypeSchema = new mongoose.Schema({
    label: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    }
  });

  // 6592ebad8e5060f55fc6d828
  module.exports = Type = mongoose.model("type", TypeSchema);