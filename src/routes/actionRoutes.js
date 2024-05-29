const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate'); // Create a middleware for authentication
const actionController = require('../controllers/actionController');


router.post('/visit', authenticate, actionController.addVisit);



module.exports = router;
