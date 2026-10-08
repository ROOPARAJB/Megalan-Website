import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { generateSync } from 'otplib';
import app from '../src/server.js';
import db from '../src/database/db.js';
import dbService from '../src/database/db-service.js';
import { seedDatabase } from '../src/database/seed.js';

describe('OWASP Top 10 & Security Architecture Automated Tests', async () => {
  before(async () => {
    process.env.NODE_ENV = 'test';
    await seedDatabase();
  });

  // 1. OWASP A05: Security Misconfiguration - HTTP Security Headers
  test('[OWASP A05] Should enforce secure HTTP headers (Helmet CSP, X-Frame-Options, NoSniff)', async () => {
    const res = await request(app).get('/');

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-security-policy'], 'CSP header must be present');
    assert.strictEqual(res.headers['x-frame-options'], 'DENY', 'Clickjacking defense: X-Frame-Options must be DENY');
    assert.strictEqual(res.headers['x-content-type-options'], 'nosniff', 'MIME sniffing defense: nosniff required');
    assert.ok(res.headers['referrer-policy'], 'Referrer policy must be present');
  });

  // 2. OWASP A01: Broken Access Control - Protected API Endpoints
  test('[OWASP A01] Unauthenticated requests to admin API should be rejected with 401', async () => {
    const res = await request(app)
      .post('/api/gallery')
      .send({ title: 'Unauthorized Test' });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  test('[OWASP A01] Protected admin dashboard route should redirect unauthenticated users to login', async () => {
    const res = await request(app).get('/admin/dashboard');
    assert.strictEqual(res.status, 302);
    assert.ok(res.headers.location.includes('/admin/login'));
  });

  // 3. OWASP A03: Injection & XSS Sanitization
  test('[OWASP A03] Form inputs with XSS vectors should be sanitized before processing', async () => {
    const xssPayload = '<script>alert("XSS")</script>John Doe';
    const res = await request(app)
      .post('/api/enquiries')
      .send({
        full_name: xssPayload,
        email: 'security.test@vpsayogafresh.com',
        mobile_number: '9876543210',
        message: 'Testing sanitization <img src=x onerror=alert(1)>',
        country_code: '+91',
        dpdp_consent: true
      });

    assert.strictEqual(res.status, 201);
    
    // Query DB to verify sanitization
    const allInq = await dbService.getInquiries();
    const saved = allInq.find(i => i.email === 'security.test@vpsayogafresh.com');
    assert.ok(saved);
    assert.ok(!saved.full_name.includes('<script>'), 'Script tags must be stripped');
    assert.ok(!saved.message.includes('<img'), 'Img payload must be stripped');
  });

  // 4. OWASP A04: Bot Honeypot Protection
  test('[OWASP A04] Honeypot trigger should safely drop spam without inserting to DB', async () => {
    const initialInq = await dbService.getInquiries();
    const initialCount = initialInq.length;

    const res = await request(app)
      .post('/api/enquiries')
      .send({
        full_name: 'Spam Bot',
        email: 'bot@spam.com',
        mobile_number: '1234567890',
        message: 'Buy crypto now',
        bot_honey: 'http://malicious-bot-link.com' // Trigger honeypot
      });

    assert.strictEqual(res.status, 200);
    const finalInq = await dbService.getInquiries();
    const finalCount = finalInq.length;
    assert.strictEqual(finalCount, initialCount, 'Honeypot entry must not be persisted in database');
  });

  // 5. Identification & Authentication Failures
  test('Authentication should fail on invalid credentials and log security event', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'IncorrectPassword123!'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);

    // Verify security log after async insert settles
    await new Promise(r => setTimeout(r, 250));
    const logs = await dbService.getAuditLogs(10);
    const log = logs.find(l => l.event_type === 'FAILED_LOGIN_ATTEMPT');
    assert.ok(log, 'Failed login must be recorded in audit log');
  });

  // 6. Complete 2FA / TOTP Authentication Flow & Recovery Codes
  test('Valid 2FA onboarding, TOTP verification, and emergency recovery code flow', async () => {
    // Reset admin 2FA for test
    await dbService.updateUser2FA('admin', {
      two_factor_enabled: 0,
      two_factor_secret: null,
      two_factor_temp_secret: null,
      two_factor_backup_codes: null
    });

    // Step 1: Initial Login triggers 2FA setup
    const step1Res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'VPSA#Secure2026!'
      });

    assert.strictEqual(step1Res.status, 200);
    assert.strictEqual(step1Res.body.require_2fa, true);
    assert.strictEqual(step1Res.body.setup_required, true);
    assert.ok(step1Res.body.qr_code, 'QR code generated');
    assert.ok(step1Res.body.secret, 'Secret key generated');
    assert.ok(step1Res.body.temp_token, 'Temporary JWT token generated');

    const secret = step1Res.body.secret;
    const tempSetupToken = step1Res.body.temp_token;

    // Reject wrong code on setup
    const invalidSetupRes = await request(app)
      .post('/api/auth/2fa/confirm-setup')
      .send({
        temp_token: tempSetupToken,
        code: '999999'
      });
    assert.strictEqual(invalidSetupRes.status, 400);

    // Confirm setup with valid code
    const validTotp = generateSync({ secret });
    const confirmRes = await request(app)
      .post('/api/auth/2fa/confirm-setup')
      .send({
        temp_token: tempSetupToken,
        code: validTotp
      });

    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.body.success, true);
    assert.ok(Array.isArray(confirmRes.body.backup_codes), 'Backup codes array returned');
    assert.strictEqual(confirmRes.body.backup_codes.length, 4, '4 recovery codes returned');
    const backupCodes = confirmRes.body.backup_codes;

    // Step 2: Next login now prompts for 2FA verification (setup_required = false)
    const step2LoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'VPSA#Secure2026!'
      });

    assert.strictEqual(step2LoginRes.status, 200);
    assert.strictEqual(step2LoginRes.body.require_2fa, true);
    assert.strictEqual(step2LoginRes.body.setup_required, false);
    const tempVerifyToken = step2LoginRes.body.temp_token;

    // Reject invalid verification code
    const badVerifyRes = await request(app)
      .post('/api/auth/2fa/verify')
      .send({
        temp_token: tempVerifyToken,
        code: '000000'
      });
    assert.strictEqual(badVerifyRes.status, 401);

    // Verify successfully with dynamic TOTP
    const currentTotp = generateSync({ secret });
    const goodVerifyRes = await request(app)
      .post('/api/auth/2fa/verify')
      .send({
        temp_token: tempVerifyToken,
        code: currentTotp
      });
    assert.strictEqual(goodVerifyRes.status, 200);
    assert.ok(goodVerifyRes.body.token, 'Session token granted');

    // Step 3: Test Emergency Backup Recovery Code login
    const step3LoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'VPSA#Secure2026!'
      });
    const tempBackupToken = step3LoginRes.body.temp_token;

    const backupCodeToUse = backupCodes[0];
    const backupVerifyRes = await request(app)
      .post('/api/auth/2fa/verify')
      .send({
        temp_token: tempBackupToken,
        code: backupCodeToUse
      });

    assert.strictEqual(backupVerifyRes.status, 200);
    assert.strictEqual(backupVerifyRes.body.used_backup_code, true);

    // Ensure the used backup code cannot be used a second time
    const step4LoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'VPSA#Secure2026!'
      });
    const reuseVerifyRes = await request(app)
      .post('/api/auth/2fa/verify')
      .send({
        temp_token: step4LoginRes.body.temp_token,
        code: backupCodeToUse
      });
    assert.strictEqual(reuseVerifyRes.status, 401, 'Used backup code must be invalidated');
  });

  // 7. Input Validation & Schema Enforcement
  test('[Validation] Invalid email address should be rejected with 400', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send({
        full_name: 'Test Buyer',
        email: 'invalid-email-format',
        mobile_number: '9876543210',
        country_code: '+91',
        message: 'Hello wholesale query',
        dpdp_consent: true
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('valid email'));
  });

  test('[Validation] Missing DPDP consent must be rejected with 400', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send({
        full_name: 'Test Buyer',
        email: 'buyer@validemail.com',
        mobile_number: '9876543210',
        country_code: '+91',
        message: 'Valid message without consent',
        dpdp_consent: false
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('consent'));
  });

  // 8. RBAC (Role-Based Access Control) Enforcement
  test('[RBAC] Low-privileged editor role cannot access or delete enquiry admin records (403 Forbidden)', async () => {
    // Seed or update an editor user
    const dbUsers = db.prepare('SELECT * FROM users WHERE role = ?').all('editor');
    let editorUser = dbUsers[0];
    if (!editorUser) {
      db.prepare('INSERT INTO users (username, password_hash, email, role, two_factor_enabled) VALUES (?, ?, ?, ?, ?)').run(
        'test_editor',
        '$2a$12$e/9V.3F7z9s1U3h8O6d7EuX1h4k4w8z8Y6A8b8C8d8e8f8g8h8i8j',
        'editor@test.com',
        'editor',
        1
      );
      editorUser = db.prepare('SELECT * FROM users WHERE username = ?').get('test_editor');
    }

    const { getJwtSecret } = await import('../src/middleware/auth.js');
    const jwt = (await import('jsonwebtoken')).default;
    const editorToken = jwt.sign(
      { id: editorUser.id, username: editorUser.username, role: 'editor' },
      getJwtSecret(),
      { expiresIn: '1h' }
    );

    // Attempt to access inquiries as editor
    const getRes = await request(app)
      .get('/api/enquiries')
      .set('Authorization', `Bearer ${editorToken}`);

    assert.strictEqual(getRes.status, 403, 'Editor must be denied with 403 Forbidden on inquiries API');
    assert.strictEqual(getRes.body.success, false);

    // Attempt to delete inquiry as editor
    const delRes = await request(app)
      .delete('/api/enquiries/1')
      .set('Authorization', `Bearer ${editorToken}`);

    assert.strictEqual(delRes.status, 403, 'Editor must be denied with 403 Forbidden on inquiry delete API');
    assert.strictEqual(delRes.body.success, false);
  });
});
