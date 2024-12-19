const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const questionController = require('../controllers/questionController');
const authenticate = require('../middleware/authenticate'); // Create a middleware for authentication



// 會員發問
router.post('/question', authenticate, questionController.createQuestion);
// 取得所有問題
router.get('/question', questionController.getAllQuestions);

// 管理員回覆
// router.post('/question/:id/response', protect, admin, respondToQuestion);



module.exports = router;
