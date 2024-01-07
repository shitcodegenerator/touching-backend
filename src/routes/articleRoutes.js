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

// Define a route to edit an article by its ID
router.put('/editArticle/:articleId', articleController.editArticle);

// Define a route to delete an article by its ID
router.delete('/deleteArticle/:articleId', articleController.deleteArticle);

module.exports = router;
