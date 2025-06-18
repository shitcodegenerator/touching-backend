const express = require('express');
const router = express.Router();
const indicatorController = require('../controllers/indicatorController.js');

// router.post('/indicator', indicatorController.addIndicator);
router.get('/indicator/:index', indicatorController.getIndicatorByIndex);
router.get('/indicator', indicatorController.getAllIndicators);
// router.post('/indicator/group', indicatorController.getIndicatorsByIndexes);
router.get('/indicator/list', indicatorController.getFormattedIndicators);

module.exports = router;