const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const createRateLimit = require("../middleware/simpleRateLimit");
const authenticate = require("../middleware/authenticate");
const landPostController = require("../controllers/landPostController");

// Upload URL rate limit - 10 分鐘 20 次
const uploadUrlLimiter = createRateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  message: {
    success: false,
    message: "上傳請求過於頻繁，請稍後再試",
    errors: [],
  },
});

// Optional auth middleware - tries to parse token but doesn't block
const optionalAuth = (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      }
    }

    if (token) {
      const decodedToken = jwt.verify(token, process.env.AUTH_KEY);
      // 與 authenticate middleware 一致：只認 userId，避免無 username 的 token（如 FB 未取得 email）被當未登入
      if (decodedToken.userId) {
        req.userData = {
          userId: decodedToken.userId,
          username: decodedToken.username,
        };
      }
    }
  } catch (_) {
    // Token invalid or expired - continue without auth
  }
  next();
};

// === Admin routes ===
const authenticateAdmin = require("../middleware/authenticateAdmin.js");

router.get(
  "/admin/list",
  authenticateAdmin,
  landPostController.adminListLandPosts,
);
router.patch(
  "/admin/:id/approve",
  authenticateAdmin,
  landPostController.adminApproveLandPost,
);
router.patch(
  "/admin/:id/reject",
  authenticateAdmin,
  landPostController.adminRejectLandPost,
);
router.delete(
  "/admin/:id",
  authenticateAdmin,
  landPostController.adminDeleteLandPost,
);

// POST /upload-url - auth + IP rate limit
router.post(
  "/upload-url",
  authenticate,
  uploadUrlLimiter,
  landPostController.generateUploadUrl,
);

// POST / - auth (create)
router.post("/", authenticate, landPostController.createLandPost);

// GET /my - auth (my posts)
router.get("/my", authenticate, landPostController.getMyLandPosts);

// GET /my-interests - auth (我已申請的案件 ID 清單)
router.get("/my-interests", authenticate, landPostController.getMyInterests);

// GET /public - no auth (public list)
router.get("/public", landPostController.getPublicLandPosts);

// GET /public/stats - no auth（土地媒合地圖用，依縣市/行政區分組筆數）
router.get("/public/stats", landPostController.getPublicLandPostStats);

// GET /public/slugs - no auth（sitemap 用，輕量 slug 清單）
router.get("/public/slugs", landPostController.getPublicLandPostSlugs);

// GET /public/by-slug/:slug - no auth（SSR 詳情頁用）
router.get("/public/by-slug/:slug", landPostController.getPublicLandPostBySlug);

// POST /:id/interest - auth (我有興趣)
router.post("/:id/interest", authenticate, landPostController.createInterest);

// GET /:id - optional auth (dual mode)
router.get("/:id", optionalAuth, landPostController.getLandPost);

// PUT /:id - auth (update)
router.put("/:id", authenticate, landPostController.updateLandPost);

// DELETE /:id - auth (delete)
router.delete("/:id", authenticate, landPostController.deleteLandPost);

module.exports = router;
