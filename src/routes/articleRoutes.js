const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const articleController = require('../controllers/articleController');


// Define the registration route
router.get('/articles', articleController.getArticles);
router.get('/categories', articleController.getCategories);
// Add new Article
router.post('/article', articleController.addArticle);

router.get('/article/:articleId', articleController.getArticleById);
router.post('/article/category', articleController.addCategory);

router.post('/uploadImage', upload.single('image'), articleController.uploadImage);

module.exports = router;
