const express = require("express");
const router = express.Router();
const indicatorControllerV2 = require("../controllers/indicatorControllerV2.js");
const authenticateAdmin = require("../middleware/authenticateAdmin.js");

// 公開讀取路由
router.get("/indicator/v2/list", indicatorControllerV2.getIndicatorListV2);
router.get(
  "/indicator/v2/list-compat",
  indicatorControllerV2.getIndicatorListCompat,
);

// CUD 路由需要管理員認證
router.put(
  "/indicator/v2/batch",
  authenticateAdmin,
  indicatorControllerV2.batchUpdateIndicators,
);
router.post(
  "/indicator/v2",
  authenticateAdmin,
  indicatorControllerV2.addIndicatorV2,
);
router.post(
  "/indicator/v2/migrate",
  authenticateAdmin,
  indicatorControllerV2.migrateFromProd,
);

module.exports = router;
