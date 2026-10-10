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
    const adminUser = await dbService.getUserByUsername('admin');
    if (adminUser) {
      await dbService.updateUser2FA(adminUser.id, {
        two_factor_enabled: 0,
        two_factor_secret: null,
        two_factor_temp_secret: null,
        two_factor_backup_codes: null
      });
    }

    // Step 1: Initial Login triggers 2FA setup
    const step1Res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'ChangeMeImmediately#2026!'
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

    // Verify backup codes are stored as bcrypt hashes and NOT plaintext (RET-08)
    const adminDbRecord = await dbService.getUserByUsername('admin');
    assert.ok(adminDbRecord.two_factor_backup_codes, 'Backup codes must be stored');
    assert.ok(!adminDbRecord.two_factor_backup_codes.includes(backupCodes[0]), 'Backup codes must NOT be stored in plaintext');
    assert.ok(adminDbRecord.two_factor_backup_codes.includes('$2'), 'Backup codes must be bcrypt hashed at rest');

    // Step 2: Next login now prompts for 2FA verification (setup_required = false)
    const step2LoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'ChangeMeImmediately#2026!'
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

    // Step 3: Test Emergency Backup Recovery Code login (Hashed check)
    const step3LoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'ChangeMeImmediately#2026!'
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
        password: process.env.ADMIN_PASSWORD || 'ChangeMeImmediately#2026!'
      });
    const reuseVerifyRes = await request(app)
      .post('/api/auth/2fa/verify')
      .send({
        temp_token: step4LoginRes.body.temp_token,
        code: backupCodeToUse
      });
    assert.strictEqual(reuseVerifyRes.status, 401, 'Used backup code must be invalidated');
  });

  // 7. Input Validation & Schema Enforcement & DPDP Persistence (RET-09)
  test('[Validation] DPDP consent must be validated and persisted in database', async () => {
    const res = await request(app)
      .post('/api/enquiries')
      .send({
        full_name: 'DPDP Test Buyer',
        email: 'dpdp.consent@vpsayogafresh.com',
        mobile_number: '9876543210',
        country_code: '+91',
        message: 'Verifying DPDP consent persistence',
        dpdp_consent: true
      });

    assert.strictEqual(res.status, 201);
    const allInq = await dbService.getInquiries();
    const saved = allInq.find(i => i.email === 'dpdp.consent@vpsayogafresh.com');
    assert.ok(saved, 'Inquiry must be stored');
    assert.strictEqual(saved.dpdp_consent, 1, 'DPDP consent must be persisted as 1');
    assert.ok(saved.dpdp_consent_timestamp, 'DPDP consent timestamp must be recorded');
  });

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

  // 9. CORS Policy Non-Reflective Denial Test (V10 hardening)
  test('[CORS] Non-whitelisted origin should be silently denied without throwing 500 error', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://malicious-attacker-site.com');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], undefined, 'Disallowed origin must not receive ACAO header');
  });

  // 10. Client JS Code Hygiene & Hardcoded Secret Check
  test('[Code Hygiene] Shipped JavaScript must not contain hardcoded service-role secrets, demo tokens, or unencrypted PII links', async () => {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    
    const adminJs = fs.readFileSync(path.resolve('./public/js/admin.js'), 'utf8');
    const contactJs = fs.readFileSync(path.resolve('./public/js/contact.js'), 'utf8');

    assert.ok(!adminJs.includes('3SG6BVQA2JE5NCT4PH3K2TUDD2TSMV4X'), 'Embedded mock secret must be removed');
    assert.ok(!adminJs.includes('VPSA-2026-ADMIN'), 'Static backup code must be removed');
    assert.ok(!adminJs.includes('vpsa-secure-session-token'), 'Hardcoded session token must be removed');
    assert.ok(!adminJs.includes('localStorage.setItem(\'vpsa_token\''), 'Persistent JWT in localStorage must be removed');
    assert.ok(!adminJs.includes('JBSWY3DPEHPK3PXP'), 'Demo secret must not exist in admin JS');
    assert.ok(!adminJs.includes('demo-session-token'), 'Demo session token must not exist in admin JS');
    assert.ok(!adminJs.includes('sb_secret_'), 'Private service role key must not exist in admin JS');
    assert.ok(!adminJs.includes('VPSA#Secure2026!'), 'Hardcoded password must not exist in admin JS');
    assert.ok(!adminJs.includes('V43MDMV3AHZFX4XEM7YJVR57HZ2OGXMC'), 'TOTP secret must not exist in admin JS');
    assert.ok(!adminJs.includes('PtiOc2XE'), 'Secret fragment must not exist in admin JS');
    assert.ok(!contactJs.includes('sb_secret_'), 'Private service role key must not exist in contact JS');
    assert.ok(!contactJs.includes('wa.me?text='), 'Auto-redirect with full PII must be removed');
  });

  // 11. Static Build & Admin Portal Defense Test (W1 & Data Defense)
  test('[Static Build Integrity] docs/ and dist/ must strictly exclude admin pages, admin JS, and customer data', async () => {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    const checkDirs = ['./docs', './dist'];
    for (const dir of checkDirs) {
      assert.ok(fs.existsSync(path.resolve(dir, 'index.html')), `${dir}/index.html must exist`);
      assert.ok(fs.existsSync(path.resolve(dir, 'about.html')), `${dir}/about.html must exist`);
      assert.ok(fs.existsSync(path.resolve(dir, 'products.html')), `${dir}/products.html must exist`);
      assert.ok(fs.existsSync(path.resolve(dir, 'gallery.html')), `${dir}/gallery.html must exist`);
      assert.ok(fs.existsSync(path.resolve(dir, 'contact.html')), `${dir}/contact.html must exist`);
      assert.ok(fs.existsSync(path.resolve(dir, 'privacy.html')), `${dir}/privacy.html must exist`);

      // Admin portal and internal scripts must be strictly purged from static public distributions
      assert.ok(!fs.existsSync(path.resolve(dir, 'admin-login.html')), `${dir}/admin-login.html must be purged to protect admin portal`);
      assert.ok(!fs.existsSync(path.resolve(dir, 'admin-dashboard.html')), `${dir}/admin-dashboard.html must be purged to protect admin data`);
      assert.ok(!fs.existsSync(path.resolve(dir, 'js/admin.js')), `${dir}/js/admin.js must be purged to prevent admin logic and data exposure`);
      assert.ok(!fs.existsSync(path.resolve(dir, 'admin')), `${dir}/admin directory must be purged`);
      assert.ok(!fs.existsSync(path.resolve(dir, 'admin-login')), `${dir}/admin-login directory must be purged`);
      assert.ok(!fs.existsSync(path.resolve(dir, 'admin-dashboard')), `${dir}/admin-dashboard directory must be purged`);

      // Read all files in docs/ and dist/ and assert no secrets or embedded inquiries exist
      const checkFolder = (folder) => {
        const entries = fs.readdirSync(folder, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(folder, entry.name);
          if (entry.isDirectory()) {
            checkFolder(fullPath);
          } else if (entry.name.endsWith('.html') || entry.name.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            assert.ok(!content.includes('DEMO_SECRET'), `${entry.name} must not contain DEMO_SECRET`);
            assert.ok(!content.includes('demo-session-token'), `${entry.name} must not contain demo-session-token`);
            assert.ok(!content.includes('JBSWY3DPEHPK3PXP'), `${entry.name} must not contain JBSWY3DPEHPK3PXP`);
            assert.ok(!content.includes('__EMBEDDED_INQUIRIES__'), `${entry.name} must not contain __EMBEDDED_INQUIRIES__`);
            assert.ok(!content.includes('__EMBEDDED_AUDIT_LOGS__'), `${entry.name} must not contain __EMBEDDED_AUDIT_LOGS__`);
            assert.ok(!content.includes('sb_secret_'), `${entry.name} must not contain sb_secret_`);
          }
        }
      };
      checkFolder(path.resolve(dir));
    }
  });

  // 12. Framebusting & Clickjacking Defense Check (W4)
  test('[Defense-in-Depth] All public HTML views must include inline framebusting defenses', async () => {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    const viewsDir = path.resolve('./views');
    const viewFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));
    assert.ok(viewFiles.length > 0);

    for (const viewFile of viewFiles) {
      const content = fs.readFileSync(path.join(viewsDir, viewFile), 'utf8');
      assert.ok(
        content.includes('window.top !== window.self') || content.includes('top!==self') || content.includes('top !== self'),
        `${viewFile} must include inline framebusting logic`
      );
    }
  });

  // 13. Unsigned Translation Script Lazy-Loading & B5 Hardening Check
  test('[Privacy & SRI Defense] Public HTML views must not include auto-loading static translate script tags', async () => {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    const viewsDir = path.resolve('./views');
    const viewFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

    for (const viewFile of viewFiles) {
      const content = fs.readFileSync(path.join(viewsDir, viewFile), 'utf8');
      assert.ok(
        !content.includes('src="https://translate.google.com/translate_a/element.js'),
        `${viewFile} must not auto-load static Google Translate script tag`
      );
    }

    // Verify main.js enforces B5 mitigations
    const mainJs = fs.readFileSync(path.resolve('./public/js/main.js'), 'utf8');
    assert.ok(mainJs.includes("referrerpolicy', 'no-referrer'"), 'Translate script must enforce referrerpolicy=no-referrer');
    assert.ok(!mainJs.includes("setAttribute('crossorigin'"), 'Translate script must not set crossorigin to avoid CORS execution failure');
    assert.ok(mainJs.includes("pathname.includes('admin')"), 'Translate engine must strictly exclude admin routes');

    // Verify admin views do not include translation container or translate CSP
    const adminViews = ['admin-dashboard.html', 'admin-login.html'];
    for (const adminFile of adminViews) {
      const adminContent = fs.readFileSync(path.join(viewsDir, adminFile), 'utf8');
      assert.ok(!adminContent.includes('google_translate_element'), `${adminFile} must not contain google_translate_element`);
      assert.ok(!adminContent.includes('translate.google.com'), `${adminFile} CSP must not allow translate.google.com`);
    }

    // Verify privacy.html documents Google Translate subprocessor and admin exclusion
    const privacyContent = fs.readFileSync(path.join(viewsDir, 'privacy.html'), 'utf8');
    assert.ok(privacyContent.includes('Google Translate'), 'privacy.html must document Google Translate');
    assert.ok(privacyContent.includes('no-referrer'), 'privacy.html must document no-referrer policy');
    assert.ok(privacyContent.includes('admin-dashboard'), 'privacy.html must document admin exclusion');
  });

  // 14. Database Synchronization & CRUD Integrity Check
  test('[Database Sync] dbService operations should execute reliably with dual-sync and fallback capabilities', async () => {
    // 1. Products retrieval
    const products = await dbService.getProducts();
    assert.ok(Array.isArray(products));
    assert.strictEqual(products.length, 8);

    const redBanana = await dbService.getProductBySlug('red-banana');
    assert.ok(redBanana);
    assert.strictEqual(redBanana.slug, 'red-banana');

    // 2. Gallery operations
    const initialGallery = await dbService.getGallery('all');
    assert.ok(Array.isArray(initialGallery));

    const newGalleryItem = await dbService.createGalleryItem({
      title: 'Database Sync Test Item',
      description: 'Testing bidirectional database synchronization',
      category: 'harvest',
      image_url: '/images/products/poovan-banana.jpg',
      file_size: 150000
    });
    assert.ok(newGalleryItem.id);

    const updatedGalleryItem = await dbService.updateGalleryItem(newGalleryItem.id, {
      title: 'Database Sync Test Item (Updated)'
    });
    assert.strictEqual(updatedGalleryItem.title, 'Database Sync Test Item (Updated)');

    const deletedGalleryItem = await dbService.deleteGalleryItem(newGalleryItem.id);
    assert.ok(deletedGalleryItem);

    // 3. User & Auth operations
    const adminUser = await dbService.getUserByUsername('admin');
    assert.ok(adminUser);
    assert.strictEqual(adminUser.username, 'admin');

    const adminById = await dbService.getUserById(adminUser.id);
    assert.ok(adminById);
    assert.strictEqual(adminById.username, 'admin');
  });

  // 15. C1 & C4 Client Guards, Honeypot & Freely Given DPDP Consent Check
  test('[C1 & C4 Form Integrity] Contact and quote forms must enforce honeypot, rate-limit, and unchecked consent', async () => {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    const contactJs = fs.readFileSync(path.resolve('./public/js/contact.js'), 'utf8');
    assert.ok(contactJs.includes('bot_honey'), 'contact.js must guard against honeypot triggers');
    assert.ok(contactJs.includes('vpsa_last_inquiry_ts'), 'contact.js must enforce 6-second rate limiting');
    assert.ok(contactJs.includes('Boolean(consentEl && consentEl.checked)'), 'contact.js must evaluate actual checked state');

    const contactHtml = fs.readFileSync(path.resolve('./views/contact.html'), 'utf8');
    assert.ok(contactHtml.includes('name="bot_honey"'), 'contact.html must include honeypot field');
    assert.ok(!contactHtml.includes('name="dpdp_consent" checked'), 'contact.html must not pre-check DPDP consent');

    const productsHtml = fs.readFileSync(path.resolve('./views/products.html'), 'utf8');
    assert.ok(productsHtml.includes('name="bot_honey"'), 'products.html modal must include honeypot field');
    assert.ok(!productsHtml.includes('name="dpdp_consent" checked'), 'products.html modal must not pre-check DPDP consent');
  });

  // 16. C3 In-Page Clickjacking Defense Check
  test('[C3 Clickjacking Defense] All public HTML views must declare X-Frame-Options DENY meta tag', async () => {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    const publicViews = ['index.html', 'about.html', 'products.html', 'gallery.html', 'contact.html', 'privacy.html', '404.html'];
    for (const view of publicViews) {
      const content = fs.readFileSync(path.resolve('./views', view), 'utf8');
      assert.ok(
        content.includes('<meta http-equiv="X-Frame-Options" content="DENY">'),
        `${view} must contain <meta http-equiv="X-Frame-Options" content="DENY">`
      );
    }
  });

  // 17. C4 Privacy Policy Consent Statement Mirroring Check
  test('[C4 Privacy Mirroring] privacy.html must mirror exact DPDP consent declaration and audit metadata', async () => {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    const privacyHtml = fs.readFileSync(path.resolve('./views/privacy.html'), 'utf8');
    const exactConsent = 'I consent to VPSA YOGA collecting and using my contact details solely for processing wholesale quotations and managing order logistics in accordance with the Privacy Policy.';
    assert.ok(privacyHtml.includes(exactConsent), 'privacy.html must contain exact quotation form consent sentence');
    assert.ok(privacyHtml.includes('dpdp-v1'), 'privacy.html must document consent version identifier');
    assert.ok(privacyHtml.includes('consent_at'), 'privacy.html must document consent timestamp field');
  });
});



