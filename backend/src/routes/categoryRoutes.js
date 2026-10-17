const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate } = require('../middleware/auth');

// List categories (authenticated)
router.get('/', authenticate, categoryController.getCategories);

// Create new category (authenticated users)
router.post('/', authenticate, categoryController.createCategory);

module.exports = router;
