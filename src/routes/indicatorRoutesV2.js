const express = require("express");
const router = express.Router();
const indicatorControllerV2 = require("../controllers/indicatorControllerV2.js");

router.get("/indicator/v2/list", indicatorControllerV2.getIndicatorListV2);
router.get(
  "/indicator/v2/list-compat",
  indicatorControllerV2.getIndicatorListCompat,
);
router.put("/indicator/v2/batch", indicatorControllerV2.batchUpdateIndicators);
router.post("/indicator/v2", indicatorControllerV2.addIndicatorV2);
router.post("/indicator/v2/migrate", indicatorControllerV2.migrateFromProd);

module.exports = router;
