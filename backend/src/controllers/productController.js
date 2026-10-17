const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');

// Preset category-to-kinds dictionary for smart UI selection
const DEFAULT_CATEGORY_KINDS = {
  Dairy: ['Milk', 'Curd', 'Paneer', 'Cheese', 'Butter', 'Ghee', 'Yogurt', 'Cream'],
  Bakery: ['Bread', 'Buns', 'Cakes', 'Cookies', 'Pastries', 'Rusk'],
  Beverages: ['Soda', 'Juice', 'Tea', 'Coffee', 'Energy Drink', 'Mineral Water'],
  Snacks: ['Chips', 'Biscuits', 'Namkeen', 'Chocolates', 'Nuts', 'Popcorn'],
  'Personal Care': ['Soap', 'Shampoo', 'Toothpaste', 'Deodorant', 'Face Wash', 'Lotion'],
  Groceries: ['Rice', 'Wheat Flour', 'Cooking Oil', 'Pulses / Dal', 'Sugar', 'Spices'],
};

/**
 * Helper to compute expiry date from DOM and shelf life
 */
function calculateExpiry(dom, shelfLifeValue, shelfLifeUnit) {
  if (!dom || !shelfLifeValue) return null;
  const expiry = new Date(dom);
  const val = Number(shelfLifeValue);
  if (shelfLifeUnit === 'days') {
    expiry.setDate(expiry.getDate() + val);
  } else if (shelfLifeUnit === 'months') {
    expiry.setMonth(expiry.getMonth() + val);
  } else if (shelfLifeUnit === 'years') {
    expiry.setFullYear(expiry.getFullYear() + val);
  }
  return expiry;
}

/**
 * GET /api/products
 * Search and filter products by name, SKU, category, kind, or stock status
 */
async function getProducts(req, res, next) {
  try {
    const {
      search,
      category,
      kind,
      stockStatus,
      includeInactive,
      sortBy = 'name',
      order = 'asc',
      page = 1,
      limit = 100,
    } = req.query;

    const query = {};

    // Filter by active status unless specifically requested to include inactive
    if (includeInactive !== 'true') {
      query.isActive = true;
    }

    // Search by name or SKU
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { sku: searchRegex }];
    }

    // Category filter
    if (category && category.trim()) {
      query.category = category.trim();
    }

    // Kind filter
    if (kind && kind.trim()) {
      query.kind = kind.trim();
    }

    // Stock status filtering
    const now = new Date();
    if (stockStatus === 'OUT_OF_STOCK') {
      query.availableStock = { $lte: 0 };
    } else if (stockStatus === 'LOW_STOCK') {
      // availableStock > 0 AND availableStock <= reorderLevel
      query.$expr = {
        $and: [
          { $gt: ['$availableStock', 0] },
          { $lte: ['$availableStock', '$reorderLevel'] },
        ],
      };
    } else if (stockStatus === 'IN_STOCK') {
      query.$expr = { $gt: ['$availableStock', '$reorderLevel'] };
    } else if (stockStatus === 'EXPIRED') {
      query.expiryDate = { $lt: now, $ne: null };
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortField = sortBy === 'stock' ? 'availableStock' : sortBy;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    // Distinct categories and kinds for filter dropdowns
    const [allCategories, allKinds] = await Promise.all([
      Product.distinct('category', { isActive: true }),
      Product.distinct('kind', { isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      categories: allCategories,
      kinds: allKinds,
      categoryKindsMap: DEFAULT_CATEGORY_KINDS,
      data: products,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/:id
 */
async function getProductById(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/products
 * Admin only: Create a new product with DOM, shelf life, auto-calculated expiry, and category/kind
 */
async function createProduct(req, res, next) {
  try {
    const {
      sku,
      name,
      category,
      kind,
      purchasePrice,
      sellingPrice,
      availableStock = 0,
      reorderLevel = 5,
      dateOfManufacture,
      shelfLifeValue,
      shelfLifeUnit = 'days',
      expiryDate,
      unit = 'pcs',
      description = '',
    } = req.body;

    if (!sku || !name || !category || purchasePrice === undefined || sellingPrice === undefined) {
      return res.status(400).json({
        success: false,
        message: 'SKU, name, category, purchase price, and selling price are required.',
      });
    }

    // Check duplicate SKU
    const existingSku = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: `Product with SKU "${sku.toUpperCase().trim()}" already exists.`,
      });
    }

    // Auto-calculate expiryDate if not manually provided
    let calculatedExpiry = expiryDate ? new Date(expiryDate) : null;
    if (!calculatedExpiry && dateOfManufacture && shelfLifeValue) {
      calculatedExpiry = calculateExpiry(dateOfManufacture, shelfLifeValue, shelfLifeUnit);
    }

    // Auto-calculate shelfLifeValue if not provided but DOM and expiryDate exist
    let calculatedShelfLifeValue =
      shelfLifeValue !== undefined && shelfLifeValue !== null && shelfLifeValue !== ''
        ? Number(shelfLifeValue)
        : null;
    let finalShelfLifeUnit = shelfLifeUnit || 'days';
    if (!calculatedShelfLifeValue && dateOfManufacture && calculatedExpiry) {
      const domTime = new Date(dateOfManufacture).getTime();
      const expTime = calculatedExpiry.getTime();
      const diffDays = Math.round((expTime - domTime) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        calculatedShelfLifeValue = diffDays;
        finalShelfLifeUnit = 'days';
      }
    }

    const product = await Product.create({
      sku: sku.toUpperCase().trim(),
      name: name.trim(),
      category: category.trim(),
      kind: kind ? kind.trim() : '',
      purchasePrice: Number(purchasePrice),
      sellingPrice: Number(sellingPrice),
      availableStock: Number(availableStock) || 0,
      reorderLevel: Number(reorderLevel) || 5,
      dateOfManufacture: dateOfManufacture ? new Date(dateOfManufacture) : null,
      shelfLifeValue: calculatedShelfLifeValue,
      shelfLifeUnit: finalShelfLifeUnit,
      expiryDate: calculatedExpiry,
      unit: unit.trim(),
      description: description.trim(),
      isActive: true,
    });

    // If initial stock was provided, record an inventory movement
    if (product.availableStock > 0) {
      await InventoryMovement.create({
        product: product._id,
        sku: product.sku,
        productName: product.name,
        type: 'RECEIVED',
        quantity: product.availableStock,
        previousStock: 0,
        newStock: product.availableStock,
        referenceId: 'INITIAL_CREATION',
        reason: 'Initial stock on product creation',
        user: req.user ? req.user._id : null,
        userName: req.user ? req.user.name : 'Admin',
        userRole: req.user ? req.user.role : 'admin',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/products/:id
 * Admin only: Update existing product details
 */
async function updateProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    const {
      sku,
      name,
      category,
      kind,
      purchasePrice,
      sellingPrice,
      reorderLevel,
      dateOfManufacture,
      shelfLifeValue,
      shelfLifeUnit,
      expiryDate,
      unit,
      description,
      isActive,
      availableStock,
    } = req.body;

    // Check SKU collision if updating SKU
    if (sku && sku.toUpperCase().trim() !== product.sku) {
      const existingSku = await Product.findOne({ sku: sku.toUpperCase().trim() });
      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: `Product with SKU "${sku.toUpperCase().trim()}" already exists.`,
        });
      }
      product.sku = sku.toUpperCase().trim();
    }

    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (kind !== undefined) product.kind = kind.trim();
    if (purchasePrice !== undefined) product.purchasePrice = Number(purchasePrice);
    if (sellingPrice !== undefined) product.sellingPrice = Number(sellingPrice);
    if (reorderLevel !== undefined) product.reorderLevel = Number(reorderLevel);
    if (unit) product.unit = unit.trim();
    if (description !== undefined) product.description = description.trim();
    if (isActive !== undefined) product.isActive = Boolean(isActive);

    if (dateOfManufacture !== undefined) {
      product.dateOfManufacture = dateOfManufacture ? new Date(dateOfManufacture) : null;
    }
    if (shelfLifeValue !== undefined) {
      product.shelfLifeValue = shelfLifeValue ? Number(shelfLifeValue) : null;
    }
    if (shelfLifeUnit !== undefined) {
      product.shelfLifeUnit = shelfLifeUnit;
    }

    // Auto recalculate expiry if modified or manually supplied
    if (expiryDate !== undefined) {
      product.expiryDate = expiryDate ? new Date(expiryDate) : null;
    } else if (product.dateOfManufacture && product.shelfLifeValue) {
      product.expiryDate = calculateExpiry(
        product.dateOfManufacture,
        product.shelfLifeValue,
        product.shelfLifeUnit
      );
    }

    // Auto calculate shelfLifeValue if not present but DOM and expiryDate exist
    if (!product.shelfLifeValue && product.dateOfManufacture && product.expiryDate) {
      const domTime = new Date(product.dateOfManufacture).getTime();
      const expTime = new Date(product.expiryDate).getTime();
      const diffDays = Math.round((expTime - domTime) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        product.shelfLifeValue = diffDays;
        if (!product.shelfLifeUnit) product.shelfLifeUnit = 'days';
      }
    }

    // If availableStock is directly changed by admin, log audit trail
    if (availableStock !== undefined && Number(availableStock) !== product.availableStock) {
      const prevStock = product.availableStock;
      const newStock = Number(availableStock);
      const diff = newStock - prevStock;

      product.availableStock = newStock;

      await InventoryMovement.create({
        product: product._id,
        sku: product.sku,
        productName: product.name,
        type: diff > 0 ? 'MANUAL_ADD' : 'MANUAL_SUBTRACT',
        quantity: diff,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: 'DIRECT_STOCK_EDIT',
        reason: req.body.adjustmentReason || 'Direct stock adjustment via product edit',
        user: req.user ? req.user._id : null,
        userName: req.user ? req.user.name : 'Admin',
        userRole: req.user ? req.user.role : 'admin',
      });
    }

    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/products/:id
 * Admin only: Deactivate product (soft-delete to preserve sales history)
 */
async function deactivateProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    product.isActive = false;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" deactivated successfully.`,
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/products/:id/toggle-status
 * Admin only: Toggle active/deactive status
 */
async function toggleProductStatus(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({
      success: true,
      message: `Product "${product.name}" is now ${product.isActive ? 'Active' : 'Deactivated'}.`,
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/products/categories/kinds
 * Get categories and subcategory kinds map
 */
async function getCategoriesAndKinds(req, res, next) {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.status(200).json({
      success: true,
      categories,
      kindsMap: DEFAULT_CATEGORY_KINDS,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  toggleProductStatus,
  getCategoriesAndKinds,
  DEFAULT_CATEGORY_KINDS,
};
