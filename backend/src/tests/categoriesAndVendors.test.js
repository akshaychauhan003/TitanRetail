import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import User from '../models/User';
import Category from '../models/Category';
import Vendor from '../models/Vendor';

let mongoServer;
let adminToken;

beforeAll(async () => {
  process.env.MONGOMS_STARTUP_TIMEOUT = '120000';
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'test_cat_ven', launchTimeout: 120000 },
  });
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  await User.create({
    name: 'Admin User',
    email: 'admin.cat@titan.com',
    password: 'password123',
    role: 'admin',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'admin.cat@titan.com',
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

describe('Category & Vendor Workflows', () => {
  it('GET /api/categories should return seeded default categories', async () => {
    const res = await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);

    const names = res.body.data.map((c) => c.name);
    expect(names).toContain('Dairy');
    expect(names).toContain('Bakery');
    expect(names).toContain('Beverages');
  });

  it('POST /api/categories should allow adding a new food category with + action', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Frozen Foods',
        kinds: ['Peas', 'French Fries', 'Corn'],
        commonProducts: ['Safal Frozen Peas 1kg', 'McCain Fries 450g'],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Frozen Foods');
    expect(res.body.data.kinds).toContain('French Fries');
  });

  it('GET /api/vendors should return verified default vendors', async () => {
    const res = await request(app)
      .get('/api/vendors')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(4);

    const names = res.body.data.map((v) => v.name);
    expect(names).toContain('Amul Dairy Wholesalers Ltd');
    expect(names).toContain('Mother Dairy Distribution Hub');
  });

  it('POST /api/vendors should allow registering a new supplier/vendor with + action', async () => {
    const res = await request(app)
      .post('/api/vendors')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Haldiram Snacks Depot',
        phone: '+91 98888 77766',
        email: 'supply@haldiramdepot.com',
        category: 'Snacks',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Haldiram Snacks Depot');
    expect(res.body.data.phone).toBe('+91 98888 77766');
  });
});
