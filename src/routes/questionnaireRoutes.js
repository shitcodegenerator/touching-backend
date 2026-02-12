const express = require('express');
const router = express.Router();
const questionnaireController = require('../controllers/questionnaireController');
const authenticateAdmin = require('../middleware/authenticateAdmin');

// 公開路由（無需認證）
router.post('/create', questionnaireController.createQuestionnaire);
router.get('/:shortId', questionnaireController.getQuestionnaireInfo);
router.post('/:shortId/response', questionnaireController.submitResponse);
router.get('/:shortId/stats', questionnaireController.getQuestionnaireStats);

// 管理員路由（需 Admin JWT 認證）
router.get('/admin/list', authenticateAdmin, questionnaireController.listAllQuestionnaires);
router.patch('/admin/:shortId/toggle', authenticateAdmin, questionnaireController.toggleQuestionnaireStatus);

module.exports = router;
