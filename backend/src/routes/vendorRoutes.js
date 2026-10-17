const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authenticate } = require('../middleware/auth');

// List vendors (authenticated)
router.get('/', authenticate, vendorController.getVendors);

// Create new vendor (authenticated users)
router.post('/', authenticate, vendorController.createVendor);

module.exports = router;
