const User = require('../models/User');
const Product = require('../models/Product');
const InventoryMovement = require('../models/InventoryMovement');
const Sale = require('../models/Sale');
const Customer = require('../models/Customer');

async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Seed] Database already contains users. Skipping initial seed.');
      return;
    }

    console.log('[Seed] Seeding initial database records...');

    // 1. Create Default Users (Store Manager, Admin & Staff)
    const storeManager = await User.create({
      name: 'Store Manager',
      email: 'storemanager@titan.com',
      password: 'admin123',
      role: 'admin',
    });

    const admin = await User.create({
      name: 'Store Administrator',
      email: 'admin@titan.com',
      password: 'admin123',
      role: 'admin',
    });

    const staff = await User.create({
      name: 'Cashier Staff',
      email: 'staff@titan.com',
      password: 'staff123',
      role: 'staff',
    });

    console.log('[Seed] Created default users:');
    console.log('       Store Manager: storemanager / admin123');
    console.log('       Admin: admin@titan.com / admin123');
    console.log('       Staff: staff@titan.com / staff123');

    // 2. Create Sample Products
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const daysAhead = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const initialProducts = [
      // EXPIRED PRODUCTS (🔴 Red Alert)
      {
        sku: 'DAIRY-YOG-EX1',
        name: 'Epigamia Greek Yogurt Plain 100g',
        category: 'Dairy',
        kind: 'Yogurt',
        purchasePrice: 28,
        sellingPrice: 40,
        availableStock: 14,
        reorderLevel: 10,
        dateOfManufacture: daysAgo(18),
        shelfLifeValue: 14,
        shelfLifeUnit: 'days',
        expiryDate: daysAgo(4), // Expired 4 days ago
        unit: 'cup',
        description: 'Probiotic Greek strained yogurt',
      },
      {
        sku: 'BAKE-BN-EX2',
        name: 'Fresh French Baguette 250g',
        category: 'Bakery',
        kind: 'Bread',
        purchasePrice: 40,
        sellingPrice: 65,
        availableStock: 6,
        reorderLevel: 5,
        dateOfManufacture: daysAgo(4),
        shelfLifeValue: 2,
        shelfLifeUnit: 'days',
        expiryDate: daysAgo(2), // Expired 2 days ago
        unit: 'loaf',
        description: 'Crispy artisanal bakery baguette',
      },

      // EXPIRING SOON PRODUCTS (🟠 Amber Alert)
      {
        sku: 'DAIRY-MILK-001',
        name: 'Amul Taaza Fresh Toned Milk 500ml',
        category: 'Dairy',
        kind: 'Milk',
        purchasePrice: 24,
        sellingPrice: 28,
        availableStock: 45,
        reorderLevel: 15,
        dateOfManufacture: daysAgo(2),
        shelfLifeValue: 3,
        shelfLifeUnit: 'days',
        expiryDate: daysAhead(1), // Expiring in 1 day
        unit: 'pouch',
        description: 'Pasteurized homogenized toned milk pouch',
      },
      {
        sku: 'BAKE-BRD-001',
        name: 'Britannia Whole Wheat Bread 400g',
        category: 'Bakery',
        kind: 'Bread',
        purchasePrice: 35,
        sellingPrice: 45,
        availableStock: 22,
        reorderLevel: 10,
        dateOfManufacture: daysAgo(3),
        shelfLifeValue: 5,
        shelfLifeUnit: 'days',
        expiryDate: daysAhead(2), // Expiring in 2 days
        unit: 'loaf',
        description: '100% Atta brown sandwich bread',
      },
      {
        sku: 'DAIRY-CURD-002',
        name: 'Mother Dairy Classic Curd 400g',
        category: 'Dairy',
        kind: 'Curd',
        purchasePrice: 32,
        sellingPrice: 40,
        availableStock: 25,
        reorderLevel: 10,
        dateOfManufacture: daysAgo(2),
        shelfLifeValue: 7,
        shelfLifeUnit: 'days',
        expiryDate: daysAhead(5),
        unit: 'tub',
        description: 'Probiotic fresh cultured dahi',
      },
      {
        sku: 'DAIRY-PAN-003',
        name: 'Fresh Malai Paneer 200g',
        category: 'Dairy',
        kind: 'Paneer',
        purchasePrice: 70,
        sellingPrice: 90,
        availableStock: 18,
        reorderLevel: 8,
        dateOfManufacture: daysAgo(1),
        shelfLifeValue: 5,
        shelfLifeUnit: 'days',
        expiryDate: daysAhead(4),
        unit: 'pack',
        description: 'Rich and soft cottage cheese block',
      },
      {
        sku: 'DAIRY-CHS-004',
        name: 'Amul Cheese Slices 200g (10 Slices)',
        category: 'Dairy',
        kind: 'Cheese',
        purchasePrice: 110,
        sellingPrice: 140,
        availableStock: 30,
        reorderLevel: 10,
        dateOfManufacture: daysAgo(15),
        shelfLifeValue: 6,
        shelfLifeUnit: 'months',
        expiryDate: daysAhead(165),
        unit: 'pack',
        description: 'Processed cheddar cheese singles',
      },
      {
        sku: 'DAIRY-BUT-005',
        name: 'Amul Butter Salted 100g',
        category: 'Dairy',
        kind: 'Butter',
        purchasePrice: 45,
        sellingPrice: 56,
        availableStock: 4, // Below reorder level (Low Stock)
        reorderLevel: 10,
        dateOfManufacture: daysAgo(10),
        shelfLifeValue: 6,
        shelfLifeUnit: 'months',
        expiryDate: daysAhead(170),
        unit: 'pack',
        description: 'Pasteurized table butter with salt',
      },
    ];

    const createdProducts = await Product.insertMany(initialProducts);
    console.log(`[Seed] Seeded ${createdProducts.length} retail products.`);

    // 3. Create initial inventory audit movement logs for starting stock
    const movements = createdProducts.map((p) => ({
      product: p._id,
      sku: p.sku,
      productName: p.name,
      type: 'RECEIVED',
      quantity: p.availableStock,
      previousStock: 0,
      newStock: p.availableStock,
      referenceId: 'INITIAL_STOCK_OPENING',
      reason: 'Initial retail stock opening inventory balance',
      user: admin._id,
      userName: admin.name,
      userRole: admin.role,
      createdAt: daysAgo(3),
    }));

    await InventoryMovement.insertMany(movements);
    console.log(`[Seed] Logged initial inventory movements audit trail.`);

    // 4. Create sample sales with various payment statuses (Paid, Partial, Unpaid)
    const pMilk = createdProducts[0];   // Milk (28)
    const pCurd = createdProducts[1];   // Curd (35)
    const pPaneer = createdProducts[2]; // Paneer (90)
    const pJuice = createdProducts[3];  // Juice (120)

    // Sale 1: Rahul Verma (Regular - Fully Paid)
    const sub1 = (2 * pMilk.sellingPrice) + (1 * pCurd.sellingPrice);
    const tax1 = Math.round(sub1 * 0.05 * 100) / 100;
    const tot1 = sub1 + tax1;
    const cost1 = (2 * pMilk.purchasePrice) + (1 * pCurd.purchasePrice);

    await Sale.create({
      invoiceNumber: 'INV-20261014-0001',
      customerName: 'Rahul Verma',
      customerPhone: '+91 9876543210',
      items: [
        {
          product: pMilk._id,
          sku: pMilk.sku,
          name: pMilk.name,
          category: pMilk.category,
          kind: pMilk.kind,
          unit: pMilk.unit,
          quantity: 2,
          unitPrice: pMilk.sellingPrice,
          costPrice: pMilk.purchasePrice,
          subtotal: 2 * pMilk.sellingPrice,
        },
        {
          product: pCurd._id,
          sku: pCurd.sku,
          name: pCurd.name,
          category: pCurd.category,
          kind: pCurd.kind,
          unit: pCurd.unit,
          quantity: 1,
          unitPrice: pCurd.sellingPrice,
          costPrice: pCurd.purchasePrice,
          subtotal: 1 * pCurd.sellingPrice,
        },
      ],
      subtotal: sub1,
      taxPercent: 5,
      taxAmount: tax1,
      totalAmount: tot1,
      totalCost: cost1,
      paymentMethod: 'UPI',
      paymentStatus: 'PAID',
      paidAmount: tot1,
      dueAmount: 0,
      paymentPercent: 100,
      cashier: staff._id,
      cashierName: staff.name,
      status: 'COMPLETED',
      createdAt: daysAgo(5),
    });

    // Sale 2: Rahul Verma (Second visit - Fully Paid)
    const sub2 = (3 * pMilk.sellingPrice) + (1 * pPaneer.sellingPrice);
    const tax2 = Math.round(sub2 * 0.05 * 100) / 100;
    const tot2 = sub2 + tax2;
    const cost2 = (3 * pMilk.purchasePrice) + (1 * pPaneer.purchasePrice);

    await Sale.create({
      invoiceNumber: 'INV-20261015-0002',
      customerName: 'Rahul Verma',
      customerPhone: '+91 9876543210',
      items: [
        {
          product: pMilk._id,
          sku: pMilk.sku,
          name: pMilk.name,
          category: pMilk.category,
          kind: pMilk.kind,
          unit: pMilk.unit,
          quantity: 3,
          unitPrice: pMilk.sellingPrice,
          costPrice: pMilk.purchasePrice,
          subtotal: 3 * pMilk.sellingPrice,
        },
        {
          product: pPaneer._id,
          sku: pPaneer.sku,
          name: pPaneer.name,
          category: pPaneer.category,
          kind: pPaneer.kind,
          unit: pPaneer.unit,
          quantity: 1,
          unitPrice: pPaneer.sellingPrice,
          costPrice: pPaneer.purchasePrice,
          subtotal: 1 * pPaneer.sellingPrice,
        },
      ],
      subtotal: sub2,
      taxPercent: 5,
      taxAmount: tax2,
      totalAmount: tot2,
      totalCost: cost2,
      paymentMethod: 'Cash',
      paymentStatus: 'PAID',
      paidAmount: tot2,
      dueAmount: 0,
      paymentPercent: 100,
      cashier: staff._id,
      cashierName: staff.name,
      status: 'COMPLETED',
      createdAt: daysAgo(3),
    });

    // Sale 3: Priya Sharma (Regular - Partial Payment 60% with 40% due)
    const sub3 = (2 * pJuice.sellingPrice) + (2 * pCurd.sellingPrice);
    const tax3 = Math.round(sub3 * 0.05 * 100) / 100;
    const tot3 = sub3 + tax3;
    const cost3 = (2 * pJuice.purchasePrice) + (2 * pCurd.purchasePrice);
    const paid3 = Math.round(tot3 * 0.6 * 100) / 100;
    const due3 = Math.round((tot3 - paid3) * 100) / 100;

    await Sale.create({
      invoiceNumber: 'INV-20261016-0003',
      customerName: 'Priya Sharma',
      customerPhone: '+91 9812345678',
      items: [
        {
          product: pJuice._id,
          sku: pJuice.sku,
          name: pJuice.name,
          category: pJuice.category,
          kind: pJuice.kind,
          unit: pJuice.unit,
          quantity: 2,
          unitPrice: pJuice.sellingPrice,
          costPrice: pJuice.purchasePrice,
          subtotal: 2 * pJuice.sellingPrice,
        },
        {
          product: pCurd._id,
          sku: pCurd.sku,
          name: pCurd.name,
          category: pCurd.category,
          kind: pCurd.kind,
          unit: pCurd.unit,
          quantity: 2,
          unitPrice: pCurd.sellingPrice,
          costPrice: pCurd.purchasePrice,
          subtotal: 2 * pCurd.sellingPrice,
        },
      ],
      subtotal: sub3,
      taxPercent: 5,
      taxAmount: tax3,
      totalAmount: tot3,
      totalCost: cost3,
      paymentMethod: 'UPI',
      paymentStatus: 'PARTIAL',
      paidAmount: paid3,
      dueAmount: due3,
      paymentPercent: 60,
      cashier: staff._id,
      cashierName: staff.name,
      status: 'COMPLETED',
      createdAt: daysAgo(2),
    });

    // Sale 4: Amit Patel (Occasional - Unpaid / Credit Khata 0%)
    const sub4 = 1 * pPaneer.sellingPrice;
    const tax4 = Math.round(sub4 * 0.05 * 100) / 100;
    const tot4 = sub4 + tax4;
    const cost4 = 1 * pPaneer.purchasePrice;

    await Sale.create({
      invoiceNumber: 'INV-20261016-0004',
      customerName: 'Amit Patel',
      customerPhone: '+91 9765432109',
      items: [
        {
          product: pPaneer._id,
          sku: pPaneer.sku,
          name: pPaneer.name,
          category: pPaneer.category,
          kind: pPaneer.kind,
          unit: pPaneer.unit,
          quantity: 1,
          unitPrice: pPaneer.sellingPrice,
          costPrice: pPaneer.purchasePrice,
          subtotal: 1 * pPaneer.sellingPrice,
        },
      ],
      subtotal: sub4,
      taxPercent: 5,
      taxAmount: tax4,
      totalAmount: tot4,
      totalCost: cost4,
      paymentMethod: 'Credit',
      paymentStatus: 'UNPAID',
      paidAmount: 0,
      dueAmount: tot4,
      paymentPercent: 0,
      cashier: staff._id,
      cashierName: staff.name,
      status: 'COMPLETED',
      createdAt: daysAgo(1),
    });

    // 5. Seed Customer Records
    await Customer.create([
      {
        name: 'Rahul Verma',
        phone: '+91 9876543210',
        email: 'rahul.verma@gmail.com',
        totalOrders: 3,
        totalSpent: Math.round((tot1 + tot2 + 550) * 100) / 100,
        totalDue: 0,
        totalProfit: Math.round(((tot1 - cost1) + (tot2 - cost2) + 160) * 100) / 100,
        firstVisit: daysAgo(15),
        lastVisit: daysAgo(3),
      },
      {
        name: 'Priya Sharma',
        phone: '+91 9812345678',
        email: 'priya.sharma@yahoo.com',
        totalOrders: 3,
        totalSpent: Math.round((tot3 + 890) * 100) / 100,
        totalDue: due3,
        totalProfit: Math.round(((tot3 - cost3) + 240) * 100) / 100,
        firstVisit: daysAgo(12),
        lastVisit: daysAgo(2),
      },
      {
        name: 'Amit Patel',
        phone: '+91 9765432109',
        email: 'amit.patel@outlook.com',
        totalOrders: 2,
        totalSpent: Math.round((tot4 + 320) * 100) / 100,
        totalDue: tot4,
        totalProfit: Math.round(((tot4 - cost4) + 80) * 100) / 100,
        firstVisit: daysAgo(8),
        lastVisit: daysAgo(1),
      },
      {
        name: 'Sneha Gupta',
        phone: '+91 9988776655',
        email: 'sneha.g@gmail.com',
        totalOrders: 1,
        totalSpent: 180,
        totalDue: 0,
        totalProfit: 50,
        firstVisit: daysAgo(25),
        lastVisit: daysAgo(25),
      },
    ]);

    console.log(`[Seed] Seeded sample sales and registered customer profiles.`);
    console.log('[Seed] Database initialization complete!');
  } catch (err) {
    console.error('[Seed] Error seeding database:', err);
  }
}

module.exports = { seedDatabase };
