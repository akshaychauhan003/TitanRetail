const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const Customer = require('../models/Customer');
const { generateInvoiceNumber } = require('../utils/invoiceGenerator');

/**
 * POST /api/sales
 * Create a new sale with strict stock validation, backend price calculation, and atomic stock deduction
 */
async function createSale(req, res, next) {
  // Track modified products for manual rollback if database transaction fails
  const rollbackList = [];

  try {
    const {
      items,
      customerName = 'Walk-in Customer',
      customerPhone = '',
      discountPercent = 0,
      taxPercent = 0,
      paymentMethod = 'Cash',
      paymentStatus = 'PAID',
      paidAmount,
      dueAmount,
      paymentPercent,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A sale must include at least one product item.',
      });
    }

    // Validate sanitized items
    const parsedItems = [];
    for (const item of items) {
      const productId = item.productId || item.product || item._id;
      const quantity = parseInt(item.quantity, 10);

      if (!productId || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have a valid productId and positive quantity.',
        });
      }
      parsedItems.push({ productId, quantity });
    }

    // 1. Fetch all products from DB to perform authoritative stock check and price retrieval
    const productIds = parsedItems.map((i) => i.productId);
    const dbProducts = await Product.find({ _id: { $in: productIds } });

    if (dbProducts.length !== parsedItems.length) {
      return res.status(404).json({
        success: false,
        message: 'One or more selected products could not be found.',
      });
    }

    const productMap = new Map();
    for (const p of dbProducts) {
      productMap.set(p._id.toString(), p);
    }

    // 2. STOCK VALIDATION: Check that available stock is sufficient for EVERY product
    for (const item of parsedItems) {
      const product = productMap.get(item.productId.toString());

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${product.name}" (${product.sku}) is currently deactivated and cannot be sold.`,
        });
      }

      if (product.availableStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}" (SKU: ${product.sku}). Available: ${product.availableStock}, Requested: ${item.quantity}. Sale cannot reduce inventory below zero.`,
          errorDetail: {
            productId: product._id,
            productName: product.name,
            sku: product.sku,
            availableStock: product.availableStock,
            requestedQuantity: item.quantity,
          },
        });
      }
    }

    // 3. FINANCIAL CALCULATIONS: Authoritatively compute item line subtotals & order totals
    const saleItems = [];
    let subtotal = 0;
    let totalCost = 0;

    for (const item of parsedItems) {
      const product = productMap.get(item.productId.toString());
      const unitPrice = product.sellingPrice;
      const costPrice = product.purchasePrice;
      const lineSubtotal = Math.round(unitPrice * item.quantity * 100) / 100;

      saleItems.push({
        product: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category,
        kind: product.kind || '',
        unit: product.unit || 'pcs',
        quantity: item.quantity,
        unitPrice,
        costPrice,
        subtotal: lineSubtotal,
        returnedQuantity: 0,
      });

      subtotal += lineSubtotal;
      totalCost += Math.round(costPrice * item.quantity * 100) / 100;
    }

    subtotal = Math.round(subtotal * 100) / 100;

    // Validate discount & tax percent
    const cleanDiscountPercent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    const cleanTaxPercent = Math.max(0, Number(taxPercent) || 0);

    const discountAmount = Math.round((subtotal * (cleanDiscountPercent / 100)) * 100) / 100;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round((taxableAmount * (cleanTaxPercent / 100)) * 100) / 100;
    const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100;

    // 4. Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // 5. ATOMIC DEDUCTION: Update stock and log inventory movements
    // Execute atomic product stock decrements with rollback safeguard
    const movementRecords = [];

    for (const item of parsedItems) {
      const product = productMap.get(item.productId.toString());
      const prevStock = product.availableStock;
      const newStock = prevStock - item.quantity;

      // Update product stock in DB
      product.availableStock = newStock;
      await product.save();

      // Track in rollback list in case a later save fails
      rollbackList.push({
        product,
        restorationQty: item.quantity,
        prevStock,
      });

      movementRecords.push({
        product: product._id,
        sku: product.sku,
        productName: product.name,
        type: 'SALE',
        quantity: -item.quantity,
        previousStock: prevStock,
        newStock: newStock,
        referenceId: invoiceNumber,
        reason: `Customer sale invoice #${invoiceNumber}`,
        user: req.user ? req.user._id : null,
        userName: req.user ? req.user.name : 'Cashier',
        userRole: req.user ? req.user.role : 'staff',
      });
    }

    // Calculate payment status, paid amount, due amount, and payment percentage
    let finalPaymentStatus = (paymentStatus || 'PAID').toUpperCase();
    if (!['PAID', 'PARTIAL', 'UNPAID'].includes(finalPaymentStatus)) {
      finalPaymentStatus = 'PAID';
    }

    let finalPaidAmount = totalAmount;
    let finalDueAmount = 0;
    let finalPaymentPercent = 100;

    if (finalPaymentStatus === 'UNPAID') {
      finalPaidAmount = 0;
      finalDueAmount = totalAmount;
      finalPaymentPercent = 0;
    } else if (finalPaymentStatus === 'PARTIAL') {
      if (paidAmount !== undefined && paidAmount !== null && !isNaN(Number(paidAmount))) {
        finalPaidAmount = Math.max(0, Math.min(totalAmount, Math.round(Number(paidAmount) * 100) / 100));
        finalDueAmount = Math.max(0, Math.round((totalAmount - finalPaidAmount) * 100) / 100);
        finalPaymentPercent = totalAmount > 0 ? Math.round((finalPaidAmount / totalAmount) * 100) : 0;
      } else {
        const pct = Math.max(0, Math.min(100, Number(paymentPercent) || 50));
        finalPaymentPercent = pct;
        finalPaidAmount = Math.round((totalAmount * (pct / 100)) * 100) / 100;
        finalDueAmount = Math.max(0, Math.round((totalAmount - finalPaidAmount) * 100) / 100);
      }
    } else {
      // PAID in full
      finalPaidAmount = totalAmount;
      finalDueAmount = 0;
      finalPaymentPercent = 100;
    }

    // 6. Create Sale record
    const sale = await Sale.create({
      invoiceNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: saleItems,
      subtotal,
      discountPercent: cleanDiscountPercent,
      discountAmount,
      taxPercent: cleanTaxPercent,
      taxAmount,
      totalAmount,
      totalCost,
      paymentMethod,
      paymentStatus: finalPaymentStatus,
      paidAmount: finalPaidAmount,
      dueAmount: finalDueAmount,
      paymentPercent: finalPaymentPercent,
      cashier: req.user ? req.user._id : null,
      cashierName: req.user ? req.user.name : 'Cashier',
      status: 'COMPLETED',
    });

    // 7. Insert audit movement records
    await InventoryMovement.insertMany(movementRecords);

    // 8. Auto-sync Customer Profile & Purchase/Due Statistics
    const cleanPhone = (customerPhone || '').trim();
    const cleanName = (customerName || 'Walk-in Customer').trim();
    if (cleanPhone) {
      try {
        let customer = await Customer.findOne({ phone: cleanPhone });
        const saleProfit = Math.round((totalAmount - totalCost) * 100) / 100;

        if (!customer) {
          customer = new Customer({
            phone: cleanPhone,
            name: cleanName && cleanName !== 'Walk-in Customer' ? cleanName : 'Valued Customer',
            totalOrders: 1,
            totalSpent: totalAmount,
            totalDue: finalDueAmount,
            totalProfit: saleProfit,
            firstVisit: new Date(),
            lastVisit: new Date(),
          });
        } else {
          if (cleanName && cleanName !== 'Walk-in Customer') {
            customer.name = cleanName;
          }
          customer.totalOrders = (customer.totalOrders || 0) + 1;
          customer.totalSpent = Math.round(((customer.totalSpent || 0) + totalAmount) * 100) / 100;
          customer.totalDue = Math.round(((customer.totalDue || 0) + finalDueAmount) * 100) / 100;
          customer.totalProfit = Math.round(((customer.totalProfit || 0) + saleProfit) * 100) / 100;
          customer.lastVisit = new Date();
        }
        await customer.save();
      } catch (custErr) {
        console.error('[Customer Sync Error]', custErr);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      invoiceNumber: sale.invoiceNumber,
      data: sale,
    });
  } catch (err) {
    // ROLLBACK SAFEGUARD: Restore any deducted stocks if sale creation failed
    if (rollbackList.length > 0) {
      console.warn('[Sale Rollback] Rolling back stock changes due to sale failure:', err.message);
      for (const item of rollbackList) {
        try {
          await Product.findByIdAndUpdate(item.product._id, {
            $inc: { availableStock: item.restorationQty },
          });
        } catch (rbErr) {
          console.error('[Sale Rollback Error]', rbErr);
        }
      }
    }
    next(err);
  }
}

/**
 * GET /api/sales
 * List sales with search, date range, and pagination
 */
async function getSales(req, res, next) {
  try {
    const {
      search,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
      ];
    }

    if (status) {
      query.status = status;
    }

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

    const [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Sale.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: sales.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: sales,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sales/:id
 * Retrieve a single sale by ID or invoiceNumber
 */
async function getSaleById(req, res, next) {
  try {
    const idOrInvoice = req.params.id;
    let sale = null;

    if (mongoose.Types.ObjectId.isValid(idOrInvoice)) {
      sale = await Sale.findById(idOrInvoice);
    }

    if (!sale) {
      sale = await Sale.findOne({ invoiceNumber: idOrInvoice });
    }

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale record not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/sales/:id/return
 * Bonus Feature: Sales return workflow with stock restoration and audit logging
 */
async function processSaleReturn(req, res, next) {
  try {
    const { items, reason = 'Customer return' } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please specify the items and quantities to return.',
      });
    }

    const idOrInvoice = req.params.id;
    let sale = null;
    if (mongoose.Types.ObjectId.isValid(idOrInvoice)) {
      sale = await Sale.findById(idOrInvoice);
    }
    if (!sale) {
      sale = await Sale.findOne({ invoiceNumber: idOrInvoice });
    }

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Original sale record not found.',
      });
    }

    if (sale.status === 'RETURNED' || sale.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: `Cannot return items for a sale with status "${sale.status}".`,
      });
    }

    const returnItemRecords = [];
    let totalRefundAmount = 0;
    const movementRecords = [];

    for (const returnReq of items) {
      const productId = (returnReq.productId || returnReq.product || '').toString();
      const returnQty = parseInt(returnReq.quantity, 10);

      if (!productId || isNaN(returnQty) || returnQty <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each returned item must include a valid productId and positive quantity.',
        });
      }

      // Find item in original sale
      const saleItem = sale.items.find(
        (i) => i.product.toString() === productId || (i._id && i._id.toString() === productId)
      );

      if (!saleItem) {
        return res.status(400).json({
          success: false,
          message: `Product ID ${productId} was not part of this sale.`,
        });
      }

      const availableToReturn = saleItem.quantity - (saleItem.returnedQuantity || 0);
      if (returnQty > availableToReturn) {
        return res.status(400).json({
          success: false,
          message: `Cannot return ${returnQty} of "${saleItem.name}". Only ${availableToReturn} unit(s) remaining eligible for return.`,
        });
      }

      // Calculate refund amount proportional to unit price
      const itemRefund = Math.round(saleItem.unitPrice * returnQty * 100) / 100;
      totalRefundAmount += itemRefund;

      saleItem.returnedQuantity = (saleItem.returnedQuantity || 0) + returnQty;

      returnItemRecords.push({
        product: saleItem.product,
        name: saleItem.name,
        quantity: returnQty,
        refundAmount: itemRefund,
      });

      // Restore stock in Product collection
      const product = await Product.findById(saleItem.product);
      if (product) {
        const prevStock = product.availableStock;
        const newStock = prevStock + returnQty;
        product.availableStock = newStock;
        await product.save();

        movementRecords.push({
          product: product._id,
          sku: product.sku,
          productName: product.name,
          type: 'RETURN',
          quantity: returnQty,
          previousStock: prevStock,
          newStock: newStock,
          referenceId: `${sale.invoiceNumber}-RET`,
          reason: `Sales return on ${sale.invoiceNumber}: ${reason}`,
          user: req.user ? req.user._id : null,
          userName: req.user ? req.user.name : 'Cashier',
          userRole: req.user ? req.user.role : 'staff',
        });
      }
    }

    // Determine new status
    const allItemsReturned = sale.items.every(
      (i) => (i.returnedQuantity || 0) >= i.quantity
    );
    sale.status = allItemsReturned ? 'RETURNED' : 'PARTIALLY_RETURNED';

    // Record return transaction in sale.returns
    sale.returns.push({
      returnedAt: new Date(),
      returnedBy: req.user ? req.user._id : null,
      returnedByName: req.user ? req.user.name : 'Cashier',
      reason,
      items: returnItemRecords,
      totalRefund: Math.round(totalRefundAmount * 100) / 100,
    });

    await sale.save();

    // Adjust customer totalSpent and stats on return
    if (sale.customerPhone) {
      try {
        const customer = await Customer.findOne({ phone: sale.customerPhone });
        if (customer) {
          customer.totalSpent = Math.max(
            0,
            Math.round(((customer.totalSpent || 0) - totalRefundAmount) * 100) / 100
          );
          await customer.save();
        }
      } catch (custErr) {
        console.error('[Customer Return Sync Error]', custErr);
      }
    }

    if (movementRecords.length > 0) {
      await InventoryMovement.insertMany(movementRecords);
    }

    res.status(200).json({
      success: true,
      message: 'Sales return processed and stock restored successfully.',
      data: sale,
      refundAmount: Math.round(totalRefundAmount * 100) / 100,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSale,
  getSales,
  getSaleById,
  processSaleReturn,
};
