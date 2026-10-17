const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');

/**
 * GET /api/inventory/low-stock
 * Identify products at or below their configured reorder level
 */
async function getLowStock(req, res, next) {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$availableStock', '$reorderLevel'] },
    }).sort({ availableStock: 1, reorderLevel: -1 });

    const outOfStockCount = products.filter((p) => p.availableStock <= 0).length;
    const lowStockCount = products.filter((p) => p.availableStock > 0 && p.availableStock <= p.reorderLevel).length;

    res.status(200).json({
      success: true,
      count: products.length,
      outOfStockCount,
      lowStockCount,
      data: products,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/inventory/adjustments
 * Record stock received or manual adjustments with full audit trail
 */
async function recordAdjustment(req, res, next) {
  try {
    const { productId, type, quantity, reason, referenceId } = req.body;

    if (!productId || !type || quantity === undefined || Number(quantity) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, valid adjustment type, and positive quantity are required.',
      });
    }

    const validTypes = ['RECEIVED', 'MANUAL_ADD', 'MANUAL_SUBTRACT', 'DAMAGE', 'EXPIRED'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid adjustment type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const qty = Number(quantity);
    const prevStock = product.availableStock;
    let newStock = prevStock;
    let signedQuantity = qty;

    if (type === 'RECEIVED' || type === 'MANUAL_ADD') {
      newStock = prevStock + qty;
      signedQuantity = qty;
    } else {
      // Subtraction (MANUAL_SUBTRACT, DAMAGE, EXPIRED)
      if (prevStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Cannot deduct ${qty} units. Current stock is only ${prevStock}. Inventory cannot fall below zero.`,
        });
      }
      newStock = prevStock - qty;
      signedQuantity = -qty;
    }

    product.availableStock = newStock;
    await product.save();

    const movement = await InventoryMovement.create({
      product: product._id,
      sku: product.sku,
      productName: product.name,
      type,
      quantity: signedQuantity,
      previousStock: prevStock,
      newStock: newStock,
      referenceId: referenceId || `ADJ-${Date.now().toString().slice(-6)}`,
      reason: reason || `Manual adjustment (${type})`,
      user: req.user ? req.user._id : null,
      userName: req.user ? req.user.name : 'System',
      userRole: req.user ? req.user.role : 'staff',
    });

    res.status(201).json({
      success: true,
      message: 'Inventory adjustment recorded successfully',
      movement,
      product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/inventory/movements
 * Audit trail of all stock changes with filters
 */
async function getMovements(req, res, next) {
  try {
    const {
      productId,
      sku,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (productId) query.product = productId;
    if (sku) query.sku = sku.toUpperCase().trim();
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [movements, total] = await Promise.all([
      InventoryMovement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      InventoryMovement.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: movements.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: movements,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLowStock,
  recordAdjustment,
  getMovements,
};
