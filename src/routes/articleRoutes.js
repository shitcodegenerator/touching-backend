const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const articleController = require("../controllers/articleController");
const authenticateAdmin = require("../middleware/authenticateAdmin");

// 公開路由（無需認證）
router.get("/articles", articleController.getArticles);
router.get("/categories", articleController.getCategories);
router.get("/article/:articleId", articleController.getArticleById);

// 管理員路由（需 Admin JWT 認證）
router.post("/article", authenticateAdmin, articleController.addArticle);
router.post(
  "/article/category",
  authenticateAdmin,
  articleController.addCategory,
);
router.post(
  "/uploadImage",
  authenticateAdmin,
  upload.single("image"),
  articleController.uploadImage,
);
router.put(
  "/article/:articleId",
  authenticateAdmin,
  articleController.editArticle,
);
router.delete(
  "/article/:articleId",
  authenticateAdmin,
  articleController.deleteArticle,
);

module.exports = router;
