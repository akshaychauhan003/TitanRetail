import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';
import Product from '../models/Product';

let mongoServer;
let adminToken;

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT = '120000';
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'test_shelf_life', launchTimeout: 120000 },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await User.create({
    name: 'Admin Shelf Test',
    email: 'admin.shelf@titan.com',
    password: 'password123',
    role: 'admin',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'admin.shelf@titan.com',
    password: 'password123',
  });
  adminToken = res.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Bi-directional Shelf Life & Expiry Date Calculation', () => {
  it('should auto-calculate shelfLifeValue when user creates product with DOM and Expiry Date', async () => {
    const dom = '2026-10-17';
    const expiry = '2026-10-24'; // 7 days later

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'TEST-DOM-EXP-1',
        name: 'Fresh Curd Test',
        category: 'Dairy',
        kind: 'Curd',
        purchasePrice: 20,
        sellingPrice: 30,
        availableStock: 10,
        dateOfManufacture: dom,
        expiryDate: expiry,
        // Notice shelfLifeValue is omitted / not passed
        unit: 'cup',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.dateOfManufacture).toBeDefined();
    expect(res.body.data.expiryDate).toBeDefined();
    // Good For (Shelf Life) should be auto-calculated to 7 days
    expect(res.body.data.shelfLifeValue).toBe(7);
    expect(res.body.data.shelfLifeUnit).toBe('days');
  });

  it('should auto-calculate expiryDate when user creates product with DOM and Shelf Life', async () => {
    const dom = '2026-10-17';
    const shelfLifeValue = 10;
    const shelfLifeUnit = 'days';

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'TEST-DOM-SHELF-2',
        name: 'Fresh Bread Test',
        category: 'Bakery',
        kind: 'Bread',
        purchasePrice: 25,
        sellingPrice: 35,
        availableStock: 15,
        dateOfManufacture: dom,
        shelfLifeValue,
        shelfLifeUnit,
        unit: 'loaf',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shelfLifeValue).toBe(10);
    // Expiry date should be 2026-10-27
    const expDate = new Date(res.body.data.expiryDate).toISOString().slice(0, 10);
    expect(expDate).toBe('2026-10-27');
  });

  it('should auto-calculate shelfLifeValue on product update when DOM and Expiry Date are provided without shelfLifeValue', async () => {
    // Create base product
    const product = await Product.create({
      sku: 'TEST-UPDATE-DOM',
      name: 'Pouch Milk',
      category: 'Dairy',
      kind: 'Milk',
      purchasePrice: 20,
      sellingPrice: 25,
      availableStock: 20,
      unit: 'pouch',
    });

    const res = await request(app)
      .put(`/api/products/${product._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        dateOfManufacture: '2026-10-17',
        expiryDate: '2026-11-01', // 15 days difference
        shelfLifeValue: null,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shelfLifeValue).toBe(15);
    expect(res.body.data.shelfLifeUnit).toBe('days');
  });
});
