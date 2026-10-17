import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';
import Product from '../models/Product';
import Sale from '../models/Sale';
import InventoryMovement from '../models/InventoryMovement';

let mongoServer;
let adminToken;
let staffToken;
let adminUser;
let staffUser;

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT = '120000';
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'test_retail', launchTimeout: 120000 },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed test Admin & Staff
  adminUser = await User.create({
    name: 'Test Administrator',
    email: 'admin.test@titan.com',
    password: 'password123',
    role: 'admin',
  });

  staffUser = await User.create({
    name: 'Test Cashier',
    email: 'staff.test@titan.com',
    password: 'password123',
    role: 'staff',
  });

  // Login to get tokens
  const adminRes = await request(app).post('/api/auth/login').send({
    email: 'admin.test@titan.com',
    password: 'password123',
  });
  adminToken = adminRes.body.token;

  const staffRes = await request(app).post('/api/auth/login').send({
    email: 'staff.test@titan.com',
    password: 'password123',
  });
  staffToken = staffRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('1. Authentication & Role-Based Access Control (RBAC)', () => {
  it('should authenticate Admin and return token with admin role', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');
  });

  it('should authenticate Staff and return token with staff role', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('staff');
  });

  it('should reject unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('should deny Staff from creating products (Admin only)', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        sku: 'TEST-SKU-001',
        name: 'Unauthorized Product',
        category: 'Dairy',
        purchasePrice: 10,
        sellingPrice: 15,
      });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Forbidden');
  });
});

describe('2. Product Management, Categories/Kinds & Auto Expiry Calculation', () => {
  let createdProductId;

  it('should allow Admin to create product with DOM, shelf life, and auto-set expiry date', async () => {
    const dom = '2026-10-01T00:00:00.000Z';
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'DAIRY-TEST-MILK',
        name: 'Fresh Cow Milk 1L',
        category: 'Dairy',
        kind: 'Milk',
        purchasePrice: 40,
        sellingPrice: 55,
        availableStock: 20,
        reorderLevel: 5,
        dateOfManufacture: dom,
        shelfLifeValue: 7,
        shelfLifeUnit: 'days',
        unit: 'pouch',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sku).toBe('DAIRY-TEST-MILK');
    expect(res.body.data.kind).toBe('Milk');

    // Verify expiry date auto-calculated to DOM + 7 days
    const expiry = new Date(res.body.data.expiryDate);
    const expected = new Date('2026-10-08T00:00:00.000Z');
    expect(expiry.toISOString().slice(0, 10)).toBe(expected.toISOString().slice(0, 10));

    createdProductId = res.body.data._id;
  });

  it('should reject duplicate SKU with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'DAIRY-TEST-MILK',
        name: 'Another Milk',
        category: 'Dairy',
        purchasePrice: 30,
        sellingPrice: 45,
      });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already exists');
  });

  it('should filter products by category and kind', async () => {
    const res = await request(app)
      .get('/api/products?category=Dairy&kind=Milk')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].kind).toBe('Milk');
  });
});

describe('3. Stock Validation & Sale Consistency (Never reduce stock below zero)', () => {
  let limitedProduct;

  beforeAll(async () => {
    limitedProduct = await Product.create({
      sku: 'BAKE-TEST-PAV',
      name: 'Fresh Pav Bun Pack',
      category: 'Bakery',
      kind: 'Buns',
      purchasePrice: 15,
      sellingPrice: 25,
      availableStock: 5,
      reorderLevel: 3,
      unit: 'pack',
      isActive: true,
    });
  });

  it('should prevent a sale when requested quantity exceeds available stock', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ productId: limitedProduct._id, quantity: 10 }], // Requested 10, only 5 available
        paymentMethod: 'Cash',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient stock');
    expect(res.body.message).toContain('Available: 5, Requested: 10');

    // CRITICAL: Stock MUST remain unchanged at 5
    const dbProduct = await Product.findById(limitedProduct._id);
    expect(dbProduct.availableStock).toBe(5);
  });

  it('should fail multi-product sale atomically if any single item has insufficient stock', async () => {
    const abundantProduct = await Product.create({
      sku: 'SNK-TEST-CHIP',
      name: 'Potato Chips 50g',
      category: 'Snacks',
      kind: 'Chips',
      purchasePrice: 10,
      sellingPrice: 20,
      availableStock: 50,
      reorderLevel: 10,
    });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [
          { productId: abundantProduct._id, quantity: 2 }, // Valid (50 available)
          { productId: limitedProduct._id, quantity: 99 },  // Invalid (only 5 available)
        ],
        paymentMethod: 'Cash',
      });

    expect(res.status).toBe(400);

    // Verify neither product had its stock reduced
    const checkAbundant = await Product.findById(abundantProduct._id);
    const checkLimited = await Product.findById(limitedProduct._id);
    expect(checkAbundant.availableStock).toBe(50);
    expect(checkLimited.availableStock).toBe(5);
  });
});

describe('4. Authoritative Price Calculation & Financial Integrity', () => {
  let pricedProduct;

  beforeAll(async () => {
    pricedProduct = await Product.create({
      sku: 'BEV-TEST-COLA',
      name: 'Cold Drink 750ml',
      category: 'Beverages',
      kind: 'Soda',
      purchasePrice: 30, // authoritative cost
      sellingPrice: 50,  // authoritative selling price
      availableStock: 25,
      reorderLevel: 5,
      isActive: true,
    });
  });

  it('should calculate subtotal, discount, tax, and total authoritatively on backend', async () => {
    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [
          {
            productId: pricedProduct._id,
            quantity: 2,
            sellingPrice: 1, // Malicious client attempts to spoof price to 1
          },
        ],
        discountPercent: 10,
        taxPercent: 5,
        paymentMethod: 'UPI',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const sale = res.body.data;
    // Expected: 2 * 50 = 100 subtotal
    expect(sale.subtotal).toBe(100);
    // Discount: 10% of 100 = 10
    expect(sale.discountAmount).toBe(10);
    // Taxable: 90. Tax: 5% of 90 = 4.5
    expect(sale.taxAmount).toBe(4.5);
    // Total: 90 + 4.5 = 94.5
    expect(sale.totalAmount).toBe(94.5);

    // Check stock was deducted accurately from 25 to 23
    const updated = await Product.findById(pricedProduct._id);
    expect(updated.availableStock).toBe(23);

    // Check inventory movement was logged
    const movement = await InventoryMovement.findOne({
      referenceId: sale.invoiceNumber,
    });
    expect(movement).toBeTruthy();
    expect(movement.type).toBe('SALE');
    expect(movement.quantity).toBe(-2);
    expect(movement.previousStock).toBe(25);
    expect(movement.newStock).toBe(23);
  });
});

describe('5. Inventory Adjustments & Audit Trail', () => {
  let adjProduct;

  beforeAll(async () => {
    adjProduct = await Product.create({
      sku: 'ADJ-TEST-001',
      name: 'Test Adjustment Product',
      category: 'Groceries',
      purchasePrice: 50,
      sellingPrice: 70,
      availableStock: 10,
      reorderLevel: 5,
      isActive: true,
    });
  });

  it('should record stock received and update product stock', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: adjProduct._id,
        type: 'RECEIVED',
        quantity: 15,
        reason: 'Received supplier shipment PO-101',
      });

    expect(res.status).toBe(201);
    expect(res.body.product.availableStock).toBe(25);

    const movement = await InventoryMovement.findOne({
      product: adjProduct._id,
      type: 'RECEIVED',
    });
    expect(movement).toBeTruthy();
    expect(movement.quantity).toBe(15);
    expect(movement.previousStock).toBe(10);
    expect(movement.newStock).toBe(25);
  });

  it('should prevent manual subtract from reducing stock below zero', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: adjProduct._id,
        type: 'MANUAL_SUBTRACT',
        quantity: 100, // Available is only 25
        reason: 'Large write-off attempt',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Inventory cannot fall below zero');
  });
});

describe('6. Sales Return Workflow with Stock Restoration (Bonus Feature)', () => {
  let returnSale;
  let returnProduct;

  beforeAll(async () => {
    returnProduct = await Product.create({
      sku: 'RET-TEST-001',
      name: 'Returnable Item',
      category: 'Snacks',
      purchasePrice: 10,
      sellingPrice: 20,
      availableStock: 10,
      reorderLevel: 2,
    });

    const saleRes = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ productId: returnProduct._id, quantity: 4 }],
        paymentMethod: 'Cash',
      });
    returnSale = saleRes.body.data;
  });

  it('should process a return, restore product stock, and log return audit', async () => {
    // Current stock after selling 4 should be 6
    const stockBefore = (await Product.findById(returnProduct._id)).availableStock;
    expect(stockBefore).toBe(6);

    const res = await request(app)
      .post(`/api/sales/${returnSale._id}/return`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ productId: returnProduct._id, quantity: 2 }],
        reason: 'Customer bought extra units',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.refundAmount).toBe(40); // 2 * 20 = 40

    // Verify stock restored from 6 to 8
    const stockAfter = (await Product.findById(returnProduct._id)).availableStock;
    expect(stockAfter).toBe(8);

    // Verify audit log
    const returnMovement = await InventoryMovement.findOne({
      product: returnProduct._id,
      type: 'RETURN',
    });
    expect(returnMovement).toBeTruthy();
    expect(returnMovement.quantity).toBe(2);
    expect(returnMovement.previousStock).toBe(6);
    expect(returnMovement.newStock).toBe(8);
  });

  it('should prevent returning more units than were sold', async () => {
    const res = await request(app)
      .post(`/api/sales/${returnSale._id}/return`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ productId: returnProduct._id, quantity: 5 }], // only 2 left eligible (4 sold - 2 already returned)
        reason: 'Excessive return attempt',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('remaining eligible for return');
  });
});

describe('7. Reports & CSV Export (Bonus Feature)', () => {
  it('should provide dashboard metrics', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalProducts).toBeGreaterThan(0);
    expect(res.body.data.totalTransactions).toBeGreaterThan(0);
  });

  it('should calculate profit report for Admin', async () => {
    const res = await request(app)
      .get('/api/reports/profit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.summary).toHaveProperty('totalRevenue');
    expect(res.body.summary).toHaveProperty('totalCostOfGoodsSold');
    expect(res.body.summary).toHaveProperty('grossProfit');
    expect(res.body.summary).toHaveProperty('profitMargin');
  });

  it('should export sales report as CSV with proper headers', async () => {
    const res = await request(app)
      .get('/api/reports/sales/csv')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Invoice Number');
    expect(res.text).toContain('Total Amount');
  });
});
