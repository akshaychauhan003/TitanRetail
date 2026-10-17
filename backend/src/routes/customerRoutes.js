const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');

// Protected routes
router.get('/', authenticate, customerController.getCustomers);
router.get('/search', authenticate, customerController.searchCustomer);
router.get('/analytics', authenticate, customerController.getCustomerAnalytics);
router.get('/:id', authenticate, customerController.getCustomerById);
router.post('/', authenticate, customerController.createCustomer);
router.post('/:id/pay-due', authenticate, customerController.recordDuePayment);

module.exports = router;
