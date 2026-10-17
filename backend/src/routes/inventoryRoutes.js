const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected routes
router.get('/low-stock', authenticate, inventoryController.getLowStock);
router.get('/movements', authenticate, inventoryController.getMovements);
router.post('/adjustments', authenticate, inventoryController.recordAdjustment);

module.exports = router;
