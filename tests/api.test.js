import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { generateSync } from 'otplib';
import app from '../src/server.js';
import db from '../src/database/db.js';
import dbService from '../src/database/db-service.js';
import { seedDatabase } from '../src/database/seed.js';

describe('VPSA YOGA FRISH Business Logic & API Tests', async () => {
  let adminToken = '';
  let sessionCookie = '';

  before(async () => {
    process.env.NODE_ENV = 'test';
    await seedDatabase();

    // Reset admin 2FA columns for clean test run
    await dbService.updateUser2FA('admin', {
      two_factor_enabled: 0,
      two_factor_secret: null,
      two_factor_temp_secret: null,
      two_factor_backup_codes: null
    });

    // Step 1: Submit credentials
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'VPSA#Secure2026!'
      });

    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.require_2fa, true);

    // Step 2: Confirm 2FA Setup with valid TOTP code
    const totpCode = generateSync({ secret: loginRes.body.secret });
    const confirmRes = await request(app)
      .post('/api/auth/2fa/confirm-setup')
      .send({
        temp_token: loginRes.body.temp_token,
        code: totpCode
      });

    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.body.success, true);
    adminToken = confirmRes.body.token;
    sessionCookie = confirmRes.headers['set-cookie'];
  });

  // Health Check Endpoint
  test('GET /api/health returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
  });

  // Products Catalog API
  test('GET /api/products returns all 8 banana varieties', async () => {
    const res = await request(app).get('/api/products');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.strictEqual(res.body.data.length, 8, 'Should return exactly 8 banana varieties from catalog');
  });

  test('GET /api/products/red-banana returns specific product details', async () => {
    const res = await request(app).get('/api/products/red-banana');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.slug, 'red-banana');
    assert.ok(res.body.data.name_en.includes('Red Banana'));
  });

  // Dynamic Gallery API & Admin CRUD
  test('GET /api/gallery returns gallery items', async () => {
    const res = await request(app).get('/api/gallery');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
  });

  test('Admin can update existing gallery photo metadata (PUT /api/gallery/:id)', async () => {
    const list = await request(app).get('/api/gallery');
    const firstItem = list.body.data[0];
    assert.ok(firstItem, 'Gallery item exists');

    const updateRes = await request(app)
      .put(`/api/gallery/${firstItem.id}`)
      .set('Cookie', sessionCookie)
      .send({
        title: 'Updated Harvest Point',
        description: 'New verified harvest batch at Oddanchatram Hub',
        category: 'harvest'
      });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);
  });

  test('Admin can upload a new photo, verify magic bytes signature, and delete it (POST & DELETE /api/gallery)', async () => {
    // Valid JPEG binary buffer (starts with FF D8 FF)
    const validJpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00]);

    const uploadRes = await request(app)
      .post('/api/gallery')
      .set('Cookie', sessionCookie)
      .field('title', 'Automated Test Harvest Photo')
      .field('description', 'High grade G9 Cavendish export cluster')
      .field('category', 'harvest')
      .attach('image', validJpegBuffer, 'test-photo.jpg');

    assert.strictEqual(uploadRes.status, 201, 'Image upload should succeed with 201');
    assert.strictEqual(uploadRes.body.success, true);
    assert.ok(uploadRes.body.data.id, 'Created record ID returned');
    assert.strictEqual(uploadRes.body.data.title, 'Automated Test Harvest Photo');

    const createdId = uploadRes.body.data.id;

    // Delete the uploaded photo
    const delRes = await request(app)
      .delete(`/api/gallery/${createdId}`)
      .set('Cookie', sessionCookie);

    assert.strictEqual(delRes.status, 200, 'Delete uploaded photo should return 200');
    assert.strictEqual(delRes.body.success, true);
  });

  test('Unauthenticated user cannot update or delete gallery photos (401)', async () => {
    const updateRes = await request(app)
      .put('/api/gallery/1')
      .send({ title: 'Hack' });
    assert.strictEqual(updateRes.status, 401);

    const delRes = await request(app)
      .delete('/api/gallery/1');
    assert.strictEqual(delRes.status, 401);
  });

  // Inquiry Submission & Admin Processing
  test('Submit and manage wholesale inquiry end-to-end', async () => {
    // 1. Submit Inquiry with DPDP consent
    const submitRes = await request(app)
      .post('/api/enquiries')
      .send({
        full_name: 'Murugan Traders',
        email: 'murugan@traders.com',
        mobile_number: '9842100000',
        country_code: '+91',
        company_name: 'Murugan Fruits Co',
        product_variety: 'Red Banana',
        quantity: '10 Tons',
        destination: 'Madurai',
        message: 'Need daily supply in cold chain reefer 13-14C.',
        dpdp_consent: true
      });

    assert.strictEqual(submitRes.status, 201);
    assert.strictEqual(submitRes.body.success, true);

    // 2. Fetch Inquiries as Admin
    const listRes = await request(app)
      .get('/api/enquiries')
      .set('Cookie', sessionCookie);

    assert.strictEqual(listRes.status, 200);
    const created = listRes.body.data.find(i => i.email === 'murugan@traders.com');
    assert.ok(created, 'Newly submitted inquiry must appear in admin list');

    // 3. Update Status
    const updateRes = await request(app)
      .patch(`/api/enquiries/${created.id}/status`)
      .set('Cookie', sessionCookie)
      .send({ status: 'contacted' });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.success, true);

    // 4. Delete Inquiry
    const delRes = await request(app)
      .delete(`/api/enquiries/${created.id}`)
      .set('Cookie', sessionCookie);

    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);
  });

  // Non-existent page 404 handler
  test('GET /non-existent-route returns 404 HTML/JSON', async () => {
    const res = await request(app).get('/some-invalid-page-url');
    assert.strictEqual(res.status, 404);
  });
});
