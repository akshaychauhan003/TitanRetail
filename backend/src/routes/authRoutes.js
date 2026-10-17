const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Public route: login
router.post('/login', authController.login);

// Public route to register (or admin-only if authenticated)
router.post('/register', authController.register);

// Protected route: get current user
router.get('/me', authenticate, authController.getMe);

module.exports = router;
