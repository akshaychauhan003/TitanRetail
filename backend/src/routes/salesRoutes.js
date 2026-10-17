const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.post('/', authenticate, salesController.createSale);
router.get('/', authenticate, salesController.getSales);
router.get('/:id', authenticate, salesController.getSaleById);
router.post('/:id/return', authenticate, salesController.processSaleReturn);

module.exports = router;
