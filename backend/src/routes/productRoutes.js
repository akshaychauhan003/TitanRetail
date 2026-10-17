const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');

// Public or Authenticated routes
router.get('/categories/kinds', authenticate, productController.getCategoriesAndKinds);
router.get('/', authenticate, productController.getProducts);
router.get('/:id', authenticate, productController.getProductById);

// Admin-only routes
router.post('/', authenticate, authorize('admin'), productController.createProduct);
router.put('/:id', authenticate, authorize('admin'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deactivateProduct);
router.patch('/:id/toggle-status', authenticate, authorize('admin'), productController.toggleProductStatus);

module.exports = router;
