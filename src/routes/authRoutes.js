const express = require('express');
const router = express.Router();
const passport = require('passport')


const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate'); // Create a middleware for authentication


// Define the registration route
router.post('/register', authController.register);
// Define the login route
router.post('/login', authController.login);

// Define the getUserData route
router.get('/profile', authenticate, authController.getUserData);
router.put('/profile/:id', authenticate, authController.editUserData);
router.post('/password/forget', authController.sendEmail);
router.post('/password/reset', authController.resetPassword);
router.get('/google', passport.authenticate('google', {
    scope: [ 'email', 'profile' ],
  }));


// Define the ADMIN registration route
router.post('/register/admin', adminController.register);
// Define the ADMIN login route
router.post('/login/admin', adminController.login);


module.exports = router;
