const mongoose = require('mongoose');

const QuestionnaireSchema = new mongoose.Schema({
  initiatorName: { type: String, required: true },
  phone: { type: String, default: '' },
  lineId: { type: String, default: '' },
  community: {
    county: { type: String, required: true },
    district: { type: String, required: true },
    name: { type: String, required: true }
  },
  shortId: { type: String, required: true, unique: true },
  accessCode: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = Questionnaire = mongoose.model('questionnaire', QuestionnaireSchema);
