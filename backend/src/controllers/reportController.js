const Sale = require('../models/Sale');
const Product = require('../models/Product');

/**
 * GET /api/reports/dashboard
 * High-level metrics for dashboard home
 */
async function getDashboardSummary(req, res, next) {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      salesMetrics,
      todayMetrics,
      recentSales,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({
        isActive: true,
        $expr: {
          $and: [
            { $gt: ['$availableStock', 0] },
            { $lte: ['$availableStock', '$reorderLevel'] },
          ],
        },
      }),
      Product.countDocuments({ isActive: true, availableStock: { $lte: 0 } }),
      // All-time sales aggregates
      Sale.aggregate([
        { $match: { status: { $ne: 'CANCELLED' } } },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            totalTransactions: { $sum: 1 },
            totalCost: { $sum: '$totalCost' },
          },
        },
      ]),
      // Today sales aggregates
      Sale.aggregate([
        {
          $match: {
            status: { $ne: 'CANCELLED' },
            createdAt: { $gte: todayStart },
          },
        },
        {
          $group: {
            _id: null,
            todaySales: { $sum: '$totalAmount' },
            todayTransactions: { $sum: 1 },
          },
        },
      ]),
      // Latest 6 sales
      Sale.find().sort({ createdAt: -1 }).limit(6),
    ]);

    const salesData = salesMetrics[0] || { totalSales: 0, totalTransactions: 0, totalCost: 0 };
    const todayData = todayMetrics[0] || { todaySales: 0, todayTransactions: 0 };

    const totalProfit = Math.round((salesData.totalSales - salesData.totalCost) * 100) / 100;
    const profitMargin = salesData.totalSales > 0
      ? Math.round((totalProfit / salesData.totalSales) * 10000) / 100
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        lowStockCount: lowStockProducts,
        outOfStockCount: outOfStockProducts,
        totalSales: Math.round(salesData.totalSales * 100) / 100,
        totalTransactions: salesData.totalTransactions,
        totalProfit,
        profitMargin,
        todaySales: Math.round(todayData.todaySales * 100) / 100,
        todayTransactions: todayData.todayTransactions,
        recentSales,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/sales
 * Sales analytics filtered by date range with daily/monthly grouping
 */
async function getSalesReport(req, res, next) {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const matchQuery = { status: { $ne: 'CANCELLED' } };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    const dateFormat = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';

    const [totals, timeline, paymentBreakdown, categoryBreakdown] = await Promise.all([
      // Overall summary in range
      Sale.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalSubtotal: { $sum: '$subtotal' },
            totalDiscount: { $sum: '$discountAmount' },
            totalTax: { $sum: '$taxAmount' },
            totalCost: { $sum: '$totalCost' },
            transactionCount: { $sum: 1 },
          },
        },
      ]),
      // Timeline breakdown
      Sale.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
            sales: { $sum: '$totalAmount' },
            transactions: { $sum: 1 },
            cost: { $sum: '$totalCost' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Payment method breakdown
      Sale.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // Category breakdown
      Sale.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.category',
            revenue: { $sum: '$items.subtotal' },
            quantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    const summary = totals[0] || {
      totalRevenue: 0,
      totalSubtotal: 0,
      totalDiscount: 0,
      totalTax: 0,
      totalCost: 0,
      transactionCount: 0,
    };

    const grossProfit = Math.round((summary.totalRevenue - summary.totalCost) * 100) / 100;
    const margin = summary.totalRevenue > 0
      ? Math.round((grossProfit / summary.totalRevenue) * 10000) / 100
      : 0;

    res.status(200).json({
      success: true,
      summary: {
        ...summary,
        grossProfit,
        profitMargin: margin,
      },
      timeline,
      paymentBreakdown,
      categoryBreakdown,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/profit
 * Detailed profit & loss report with COGS and margins
 */
async function getProfitReport(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = { status: { $ne: 'CANCELLED' } };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    const [summaryResult, productProfitList] = await Promise.all([
      Sale.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalCost: { $sum: '$totalCost' },
            totalDiscount: { $sum: '$discountAmount' },
            totalTax: { $sum: '$taxAmount' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      // Product-level profit analysis
      Sale.aggregate([
        { $match: matchQuery },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            sku: { $first: '$items.sku' },
            category: { $first: '$items.category' },
            kind: { $first: '$items.kind' },
            totalSoldQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: '$items.subtotal' },
            totalCost: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            sku: 1,
            category: 1,
            kind: 1,
            totalSoldQuantity: 1,
            totalRevenue: { $round: ['$totalRevenue', 2] },
            totalCost: { $round: ['$totalCost', 2] },
            grossProfit: { $round: [{ $subtract: ['$totalRevenue', '$totalCost'] }, 2] },
            profitMargin: {
              $cond: [
                { $gt: ['$totalRevenue', 0] },
                {
                  $round: [
                    {
                      $multiply: [
                        { $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] },
                        100,
                      ],
                    },
                    2,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $sort: { grossProfit: -1 } },
      ]),
    ]);

    const summary = summaryResult[0] || {
      totalRevenue: 0,
      totalCost: 0,
      totalDiscount: 0,
      totalTax: 0,
      orderCount: 0,
    };

    const grossProfit = Math.round((summary.totalRevenue - summary.totalCost) * 100) / 100;
    const profitMargin = summary.totalRevenue > 0
      ? Math.round((grossProfit / summary.totalRevenue) * 10000) / 100
      : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
        totalCostOfGoodsSold: Math.round(summary.totalCost * 100) / 100,
        grossProfit,
        profitMargin,
        totalDiscount: Math.round(summary.totalDiscount * 100) / 100,
        totalTax: Math.round(summary.totalTax * 100) / 100,
        orderCount: summary.orderCount,
      },
      products: productProfitList,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/top-selling
 * Top-selling products ranked by volume and revenue
 */
async function getTopSelling(req, res, next) {
  try {
    const { limit = 10, startDate, endDate } = req.query;

    const matchQuery = { status: { $ne: 'CANCELLED' } };
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    const topProducts = await Sale.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          category: { $first: '$items.category' },
          unit: { $first: '$items.unit' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: Number(limit) },
    ]);

    // Attach current stock
    const productIds = topProducts.map((p) => p._id);
    const dbProducts = await Product.find({ _id: { $in: productIds } }).select(
      'availableStock reorderLevel'
    );
    const stockMap = new Map();
    dbProducts.forEach((p) => stockMap.set(p._id.toString(), p));

    const enriched = topProducts.map((p) => {
      const match = stockMap.get(p._id.toString());
      return {
        ...p,
        availableStock: match ? match.availableStock : 0,
        reorderLevel: match ? match.reorderLevel : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/sales/csv
 * Bonus feature: Download sales report as CSV
 */
async function downloadSalesCSV(req, res, next) {
  try {
    const { startDate, endDate } = req.query;

    const query = { status: { $ne: 'CANCELLED' } };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const sales = await Sale.find(query).sort({ createdAt: -1 });

    const escapeCSV = (field) => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Invoice Number',
      'Date',
      'Customer Name',
      'Customer Phone',
      'Items Count',
      'Subtotal',
      'Discount Amount',
      'Tax Amount',
      'Total Amount',
      'Payment Method',
      'Cashier',
      'Status',
    ];

    const rows = sales.map((sale) => [
      escapeCSV(sale.invoiceNumber),
      escapeCSV(sale.createdAt ? sale.createdAt.toISOString().slice(0, 10) : ''),
      escapeCSV(sale.customerName),
      escapeCSV(sale.customerPhone || 'N/A'),
      sale.items.length,
      sale.subtotal.toFixed(2),
      sale.discountAmount.toFixed(2),
      sale.taxAmount.toFixed(2),
      sale.totalAmount.toFixed(2),
      escapeCSV(sale.paymentMethod),
      escapeCSV(sale.cashierName),
      escapeCSV(sale.status),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const filename = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardSummary,
  getSalesReport,
  getProfitReport,
  getTopSelling,
  downloadSalesCSV,
};
