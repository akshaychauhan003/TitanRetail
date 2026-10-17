import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';
import Product from '../models/Product';
import Customer from '../models/Customer';
import Sale from '../models/Sale';

let mongoServer;
let adminToken;
let testProduct1;
let testProduct2;

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT = '120000';
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'test_crm', launchTimeout: 120000 },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Create admin user & login
  await User.create({
    name: 'Admin CRM Tester',
    email: 'admin.crm@titan.com',
    password: 'password123',
    role: 'admin',
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'admin.crm@titan.com',
    password: 'password123',
  });
  adminToken = loginRes.body.token;

  // Create test products
  testProduct1 = await Product.create({
    sku: 'CRM-PRD-001',
    name: 'Premium Basmati Rice 5kg',
    category: 'Groceries',
    purchasePrice: 400,
    costPrice: 400,
    sellingPrice: 600,
    availableStock: 100,
    reorderLevel: 10,
    unit: 'bags',
  });

  testProduct2 = await Product.create({
    sku: 'CRM-PRD-002',
    name: 'Cold Pressed Mustard Oil 1L',
    category: 'Cooking Oils',
    purchasePrice: 150,
    costPrice: 150,
    sellingPrice: 220,
    availableStock: 50,
    reorderLevel: 5,
    unit: 'bottles',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Customer Management, Auto-fill, & Partial/Unpaid Payments', () => {
  it('1. should create a sale with PARTIAL payment (50%) and track dueAmount & customer record', async () => {
    const salePayload = {
      customerPhone: '9876543210',
      customerName: 'Aman Sharma',
      items: [{ productId: testProduct1._id.toString(), quantity: 2 }],
      taxPercent: 0,
      discountPercent: 0,
      paymentStatus: 'PARTIAL',
      paymentPercent: 50,
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(salePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const sale = res.body.data;
    // 2 x 600 = 1200 total
    expect(sale.totalAmount).toBe(1200);
    expect(sale.paymentStatus).toBe('PARTIAL');
    expect(sale.paidAmount).toBe(600);
    expect(sale.dueAmount).toBe(600);

    // Verify Customer record was automatically created
    const customer = await Customer.findOne({ phone: '9876543210' });
    expect(customer).not.toBeNull();
    expect(customer.name).toBe('Aman Sharma');
    expect(customer.totalOrders).toBe(1);
    expect(customer.totalSpent).toBe(1200);
    expect(customer.totalDue).toBe(600);
    // Cost: 2 x 400 = 800. Profit = 1200 - 800 = 400
    expect(customer.totalProfit).toBe(400);
  });

  it('2. should auto-match returning customer by phone and auto-fill customer name', async () => {
    const res = await request(app)
      .get('/api/customers/search?phone=9876543210')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.found).toBe(true);
    expect(res.body.customer).not.toBeNull();
    expect(res.body.customer.name).toBe('Aman Sharma');
    expect(res.body.customer.phone).toBe('9876543210');
    expect(res.body.customer.totalDue).toBe(600);
  });

  it('3. should accumulate repeat orders for existing customer and handle UNPAID credit bill', async () => {
    // Aman Sharma visits a 2nd time, buys Mustard Oil on full credit / UNPAID
    const salePayload = {
      customerPhone: '9876543210',
      customerName: 'Aman Sharma',
      items: [{ productId: testProduct2._id.toString(), quantity: 3 }],
      taxPercent: 0,
      discountPercent: 0,
      paymentStatus: 'UNPAID',
    };

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(salePayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const sale = res.body.data;
    // 3 x 220 = 660 total
    expect(sale.totalAmount).toBe(660);
    expect(sale.paymentStatus).toBe('UNPAID');
    expect(sale.paidAmount).toBe(0);
    expect(sale.dueAmount).toBe(660);

    // Verify Customer record updated with accumulated metrics
    const customer = await Customer.findOne({ phone: '9876543210' });
    expect(customer.totalOrders).toBe(2);
    // Previous 1200 + 660 = 1860
    expect(customer.totalSpent).toBe(1860);
    // Previous 600 + 660 = 1260
    expect(customer.totalDue).toBe(1260);
    // 2nd sale profit: 660 - (3 * 150 = 450) = 210. Total profit: 400 + 210 = 610
    expect(customer.totalProfit).toBe(610);
  });

  it('4. should classify repeat customer when visit count reaches 3 (REGULAR tier)', async () => {
    // Aman Sharma visits 3rd time
    const salePayload = {
      customerPhone: '9876543210',
      customerName: 'Aman Sharma',
      items: [{ productId: testProduct1._id.toString(), quantity: 1 }],
      taxPercent: 0,
      discountPercent: 0,
      paymentStatus: 'PAID',
    };

    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(salePayload);

    const customerRes = await request(app)
      .get(`/api/customers/9876543210`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(customerRes.status).toBe(200);
    expect(customerRes.body.success).toBe(true);

    const { customer, analytics } = customerRes.body.data;
    expect(customer.totalOrders).toBe(3);
    expect(customer.loyaltyStatus).toBe('REGULAR');
    expect(analytics.avgOrderValue).toBeGreaterThan(0);
    expect(analytics.totalProfit).toBeGreaterThan(0);
    expect(analytics.topPurchasedProducts.length).toBeGreaterThan(0);
    // Top product should be Basmati Rice (bought 2 in first sale + 1 in 3rd sale = 3 units)
    expect(analytics.topPurchasedProducts[0].name).toBe('Premium Basmati Rice 5kg');
    expect(analytics.topPurchasedProducts[0].totalQuantity).toBe(3);
  });

  it('5. should record due payment / khata collection and update pending balance', async () => {
    const customer = await Customer.findOne({ phone: '9876543210' });
    const initialDue = customer.totalDue;
    expect(initialDue).toBe(1260);

    const payRes = await request(app)
      .post(`/api/customers/${customer._id}/pay-due`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        amount: 500,
        paymentMethod: 'UPI / QR',
        note: 'Customer paid partial balance via PhonePe',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.customer.totalDue).toBe(760);

    const updatedCustomer = await Customer.findById(customer._id);
    expect(updatedCustomer.totalDue).toBe(760);
  });

  it('6. should return store-wide customer analytics summary', async () => {
    const res = await request(app)
      .get('/api/customers/analytics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalCustomers).toBeGreaterThanOrEqual(1);
    expect(res.body.summary.regularCount).toBeGreaterThanOrEqual(1);
    expect(res.body.summary.totalDueOutstanding).toBeGreaterThan(0);
  });
});
