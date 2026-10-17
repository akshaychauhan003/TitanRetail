const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

/**
 * GET /api/customers
 * List customers with search, loyalty filter, sorting, and pagination
 */
async function getCustomers(req, res, next) {
  try {
    const {
      search,
      type, // 'REGULAR', 'RARE', 'OCCASIONAL', 'WITH_DUE', 'ALL'
      sortBy = 'spent', // 'spent', 'orders', 'profit', 'due', 'recent'
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { phone: regex }, { email: regex }];
    }

    if (type === 'WITH_DUE') {
      query.totalDue = { $gt: 0 };
    } else if (type === 'REGULAR') {
      query.$or = [{ totalOrders: { $gte: 3 } }, { totalSpent: { $gte: 2000 } }];
    } else if (type === 'RARE') {
      query.totalOrders = { $lte: 1 };
    } else if (type === 'OCCASIONAL') {
      query.totalOrders = 2;
    }

    let sortOptions = { totalSpent: -1 };
    if (sortBy === 'orders') sortOptions = { totalOrders: -1 };
    if (sortBy === 'profit') sortOptions = { totalProfit: -1 };
    if (sortBy === 'due') sortOptions = { totalDue: -1 };
    if (sortBy === 'recent') sortOptions = { lastVisit: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit)),
      Customer.countDocuments(query),
    ]);

    // Enhance with calculated fields
    const enriched = customers.map((c) => {
      const obj = c.toJSON();
      obj.avgOrderValue =
        obj.totalOrders > 0
          ? Math.round((obj.totalSpent / obj.totalOrders) * 100) / 100
          : 0;
      obj.profitMargin =
        obj.totalSpent > 0
          ? Math.round((obj.totalProfit / obj.totalSpent) * 10000) / 100
          : 0;
      return obj;
    });

    res.status(200).json({
      success: true,
      count: enriched.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/customers/search
 * Fast lookup by mobile number or query for POS auto-completion
 */
async function searchCustomer(req, res, next) {
  try {
    const { phone, q } = req.query;
    const term = (phone || q || '').trim();

    if (!term) {
      return res.status(200).json({
        success: true,
        found: false,
        customer: null,
        candidates: [],
      });
    }

    // Exact phone match check
    const exactMatch = await Customer.findOne({
      phone: term,
    });

    if (exactMatch) {
      return res.status(200).json({
        success: true,
        found: true,
        customer: exactMatch,
        candidates: [exactMatch],
      });
    }

    // Partial search
    const regex = new RegExp(term, 'i');
    const candidates = await Customer.find({
      $or: [{ phone: regex }, { name: regex }],
    })
      .sort({ totalOrders: -1 })
      .limit(6);

    res.status(200).json({
      success: true,
      found: candidates.length > 0,
      customer: candidates.length === 1 ? candidates[0] : null,
      candidates,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/customers/:id
 * Retrieve customer details, profit analysis, top-purchased products, and invoices
 */
async function getCustomerById(req, res, next) {
  try {
    const { id } = req.params;

    let customer = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      customer = await Customer.findById(id);
    }
    if (!customer) {
      customer = await Customer.findOne({ phone: id });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // 1. Fetch sales invoices for this customer
    const sales = await Sale.find({
      $or: [
        { customerPhone: customer.phone },
        { customerName: new RegExp(`^${customer.name}$`, 'i') },
      ],
      status: { $ne: 'CANCELLED' },
    }).sort({ createdAt: -1 });

    // 2. Aggregate "What they purchase most" (Products breakdown with quantities & spending)
    const productStatsMap = new Map();

    sales.forEach((sale) => {
      sale.items?.forEach((item) => {
        const prodId = (item.product || item._id).toString();
        const existing = productStatsMap.get(prodId) || {
          productId: prodId,
          sku: item.sku,
          name: item.name,
          category: item.category || 'General',
          unit: item.unit || 'pcs',
          totalQuantity: 0,
          totalSpent: 0,
          totalProfit: 0,
          orderCount: 0,
        };

        const qty = item.quantity - (item.returnedQuantity || 0);
        if (qty > 0) {
          const itemSpend = Math.round(item.unitPrice * qty * 100) / 100;
          const itemCost = Math.round((item.costPrice || 0) * qty * 100) / 100;
          const itemProfit = Math.round((itemSpend - itemCost) * 100) / 100;

          existing.totalQuantity += qty;
          existing.totalSpent = Math.round((existing.totalSpent + itemSpend) * 100) / 100;
          existing.totalProfit = Math.round((existing.totalProfit + itemProfit) * 100) / 100;
          existing.orderCount += 1;
        }

        productStatsMap.set(prodId, existing);
      });
    });

    const topPurchasedProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    // 3. Category distribution
    const categoryStatsMap = new Map();
    topPurchasedProducts.forEach((p) => {
      const cat = p.category || 'General';
      const existing = categoryStatsMap.get(cat) || { category: cat, totalQuantity: 0, totalSpent: 0 };
      existing.totalQuantity += p.totalQuantity;
      existing.totalSpent = Math.round((existing.totalSpent + p.totalSpent) * 100) / 100;
      categoryStatsMap.set(cat, existing);
    });
    const categoryBreakdown = Array.from(categoryStatsMap.values());

    // 4. Lifetime Metrics
    const totalOrders = sales.length;
    const totalSpent = Math.round(sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0) * 100) / 100;
    const totalCost = Math.round(sales.reduce((sum, s) => sum + (s.totalCost || 0), 0) * 100) / 100;
    const totalProfit = Math.round((totalSpent - totalCost) * 100) / 100;
    const avgOrderValue = totalOrders > 0 ? Math.round((totalSpent / totalOrders) * 100) / 100 : 0;
    const profitMargin = totalSpent > 0 ? Math.round((totalProfit / totalSpent) * 10000) / 100 : 0;
    const totalDue = Math.round(sales.reduce((sum, s) => sum + (s.dueAmount || 0), 0) * 100) / 100;

    // Customer classification
    let loyaltyStatus = 'RARE';
    if (totalOrders >= 3 || totalSpent >= 2000) {
      loyaltyStatus = 'REGULAR';
    } else if (totalOrders === 2) {
      loyaltyStatus = 'OCCASIONAL';
    }

    res.status(200).json({
      success: true,
      data: {
        customer: {
          ...customer.toJSON(),
          totalOrders,
          totalSpent,
          totalProfit,
          totalDue,
          avgOrderValue,
          profitMargin,
          loyaltyStatus,
        },
        analytics: {
          totalOrders,
          totalSpent,
          totalProfit,
          profitMargin,
          avgOrderValue,
          totalDue,
          loyaltyStatus,
          topPurchasedProducts,
          categoryBreakdown,
        },
        invoices: sales,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/customers/analytics/summary
 * High-level overview: regular vs rare count, total due, top customers
 */
async function getCustomerAnalytics(req, res, next) {
  try {
    const allCustomers = await Customer.find();

    const totalCustomers = allCustomers.length;
    let regularCount = 0;
    let occasionalCount = 0;
    let rareCount = 0;
    let totalDueOutstanding = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    allCustomers.forEach((c) => {
      totalDueOutstanding += c.totalDue || 0;
      totalRevenue += c.totalSpent || 0;
      totalProfit += c.totalProfit || 0;

      if ((c.totalOrders || 0) >= 3 || (c.totalSpent || 0) >= 2000) {
        regularCount++;
      } else if ((c.totalOrders || 0) === 2) {
        occasionalCount++;
      } else {
        rareCount++;
      }
    });

    const topSpenders = [...allCustomers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 5)
      .map((c) => ({
        id: c._id,
        name: c.name,
        phone: c.phone,
        totalSpent: c.totalSpent,
        totalProfit: c.totalProfit,
        totalOrders: c.totalOrders,
        avgOrderValue: c.totalOrders > 0 ? Math.round((c.totalSpent / c.totalOrders) * 100) / 100 : 0,
      }));

    const customersWithDue = [...allCustomers]
      .filter((c) => (c.totalDue || 0) > 0)
      .sort((a, b) => b.totalDue - a.totalDue)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      summary: {
        totalCustomers,
        regularCount,
        occasionalCount,
        rareCount,
        totalDueOutstanding: Math.round(totalDueOutstanding * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgLifetimeValue: totalCustomers > 0 ? Math.round((totalRevenue / totalCustomers) * 100) / 100 : 0,
      },
      topSpenders,
      customersWithDue,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/customers/:id/pay-due
 * Record payment to clear or reduce outstanding customer due/khata
 */
async function recordDuePayment(req, res, next) {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'Cash', note = 'Due payment settlement' } = req.body;

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid positive payment amount.',
      });
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    if (customer.totalDue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer has no outstanding due to pay.',
      });
    }

    const appliedAmount = Math.min(customer.totalDue, paymentAmount);
    customer.totalDue = Math.max(0, Math.round((customer.totalDue - appliedAmount) * 100) / 100);
    await customer.save();

    // Settle due on pending invoices (oldest unpaid/partial first)
    const unpaidSales = await Sale.find({
      customerPhone: customer.phone,
      dueAmount: { $gt: 0 },
    }).sort({ createdAt: 1 });

    let remainingToApply = appliedAmount;
    for (const sale of unpaidSales) {
      if (remainingToApply <= 0) break;
      const deduction = Math.min(sale.dueAmount, remainingToApply);
      sale.dueAmount = Math.max(0, Math.round((sale.dueAmount - deduction) * 100) / 100);
      sale.paidAmount = Math.round(((sale.paidAmount || 0) + deduction) * 100) / 100;
      sale.paymentStatus = sale.dueAmount === 0 ? 'PAID' : 'PARTIAL';
      await sale.save();
      remainingToApply -= deduction;
    }

    res.status(200).json({
      success: true,
      message: `Successfully collected ₹${appliedAmount.toFixed(2)} due payment. Remaining due: ₹${customer.totalDue.toFixed(2)}.`,
      data: customer,
      customer,
      collectedAmount: appliedAmount,
      remainingDue: customer.totalDue,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/customers
 * Create or update a customer manually
 */
async function createCustomer(req, res, next) {
  try {
    const { name, phone, email, address, notes } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer mobile number is required.',
      });
    }

    const cleanPhone = phone.trim();
    let customer = await Customer.findOne({ phone: cleanPhone });

    if (customer) {
      if (name) customer.name = name.trim();
      if (email !== undefined) customer.email = email.trim();
      if (address !== undefined) customer.address = address.trim();
      if (notes !== undefined) customer.notes = notes.trim();
      await customer.save();
      return res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer,
      });
    }

    customer = await Customer.create({
      phone: cleanPhone,
      name: (name || 'Valued Customer').trim(),
      email: (email || '').trim(),
      address: (address || '').trim(),
      notes: (notes || '').trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      data: customer,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCustomers,
  searchCustomer,
  getCustomerById,
  getCustomerAnalytics,
  recordDuePayment,
  createCustomer,
};
