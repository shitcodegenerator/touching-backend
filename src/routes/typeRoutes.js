const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const typeController = require('../controllers/typeController');


// Define the registration route
router.get('/types', typeController.getTypes);

module.exports = router;
