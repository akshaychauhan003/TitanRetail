const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

// Protected report routes
router.get('/dashboard', authenticate, reportController.getDashboardSummary);
router.get('/sales', authenticate, reportController.getSalesReport);
router.get('/profit', authenticate, authorize('admin'), reportController.getProfitReport);
router.get('/top-selling', authenticate, reportController.getTopSelling);
router.get('/sales/csv', authenticate, reportController.downloadSalesCSV);

module.exports = router;
