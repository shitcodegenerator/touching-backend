const mongoose = require('mongoose');

const QuestionnaireResponseSchema = new mongoose.Schema({
  questionnaireId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'questionnaire',
    required: true,
    index: true
  },
  supportLevel: {
    type: String,
    required: true,
    enum: ['very_supportive', 'supportive', 'neutral', 'not_supportive', 'very_not_supportive']
  },
  comment: { type: String, required: true },
  respondentName: { type: String, default: '' },
  contactInfo: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = QuestionnaireResponse = mongoose.model('questionnaireResponse', QuestionnaireResponseSchema);
