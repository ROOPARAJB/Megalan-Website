import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '.');
const publicDir = path.resolve(rootDir, 'public');
const viewsDir = path.resolve(rootDir, 'views');
const distDir = path.resolve(rootDir, 'dist');
const docsDir = path.resolve(rootDir, 'docs');

const targetDirs = [distDir, docsDir];

for (const targetDir of targetDirs) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  // 1. Copy public assets (css, js, images)
  const items = ['css', 'js', 'images'];
  for (const item of items) {
    const src = path.join(publicDir, item);
    const dest = path.join(targetDir, item);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true, force: true });
    }
  }

  // Strip developer comments and documentation from published admin.js
  const destAdminJs = path.join(targetDir, 'js', 'admin.js');
  if (fs.existsSync(destAdminJs)) {
    let adminContent = fs.readFileSync(destAdminJs, 'utf8');
    adminContent = adminContent.replace(/\/\*[\s\S]*?\*\//g, '');
    adminContent = adminContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.startsWith('//') && line.length > 0)
      .join('\n');
    fs.writeFileSync(destAdminJs, adminContent, 'utf8');
  }

  // 2. Copy _headers and CNAME configuration files
  const headersSrc = path.join(publicDir, '_headers');
  if (fs.existsSync(headersSrc)) {
    fs.copyFileSync(headersSrc, path.join(targetDir, '_headers'));
  }
  const cnameSrc = path.join(publicDir, 'CNAME');
  if (fs.existsSync(cnameSrc)) {
    fs.copyFileSync(cnameSrc, path.join(targetDir, 'CNAME'));
  }

  // 3. Add .nojekyll for GitHub Pages
  fs.writeFileSync(path.join(targetDir, '.nojekyll'), '', 'utf8');

  // 4. Compile all views into clean-URL directory structures & fallback .html files
  const viewFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

  for (const file of viewFiles) {
    let content = fs.readFileSync(path.join(viewsDir, file), 'utf8');

    // Keep clean URLs in user-facing links
    content = content
      .replace(/href="about\.html"/g, 'href="/about"')
      .replace(/href="products\.html"/g, 'href="/products"')
      .replace(/href="gallery\.html"/g, 'href="/gallery"')
      .replace(/href="contact\.html"/g, 'href="/contact"')
      .replace(/href="privacy\.html"/g, 'href="/privacy"')
      .replace(/href="index\.html"/g, 'href="/"');

    const baseName = file.replace('.html', '');

    if (baseName === 'admin-dashboard') {
      let embeddedGallery = [];
      let embeddedInquiries = [];
      let embeddedAudit = [];

      try {
        const Database = (await import('better-sqlite3')).default;
        const dbPath = path.resolve(rootDir, 'data', 'vpsa_database.sqlite');
        if (fs.existsSync(dbPath)) {
          const sqlite = new Database(dbPath, { readonly: true });
          embeddedGallery = sqlite.prepare('SELECT id, title, description, category, image_url, file_size, created_at, updated_at FROM gallery ORDER BY created_at DESC').all();
          embeddedInquiries = sqlite.prepare('SELECT id, full_name, email, country_code, mobile_number, company_name, product_variety, quantity, destination, message, status, ip_address, created_at FROM inquiries ORDER BY created_at DESC').all();
          embeddedAudit = sqlite.prepare('SELECT id, event_type, description, user_id, ip_address, user_agent, severity, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
          sqlite.close();
        }
      } catch (err) {
        console.warn('⚠️ SQLite embedding notice:', err.message);
      }

      const embeddedScript = `<script id="vpsa-embedded-data">
window.__EMBEDDED_GALLERY__ = ${JSON.stringify(embeddedGallery)};
window.__EMBEDDED_INQUIRIES__ = ${JSON.stringify(embeddedInquiries)};
window.__EMBEDDED_AUDIT_LOGS__ = ${JSON.stringify(embeddedAudit)};
</script>`;
      content = content.replace('</head>', `${embeddedScript}\n</head>`);
    }

    // Write file.html at root of dist
    fs.writeFileSync(path.join(targetDir, file), content, 'utf8');

    // For clean directory routing (e.g., /about/index.html), create sub-folder unless it's index or 404
    if (baseName !== 'index' && baseName !== '404') {
      if (baseName === 'admin-login') {
        const adminLoginDir = path.join(targetDir, 'admin', 'login');
        fs.mkdirSync(adminLoginDir, { recursive: true });
        fs.writeFileSync(path.join(adminLoginDir, 'index.html'), content, 'utf8');

        const directLoginDir = path.join(targetDir, 'admin-login');
        fs.mkdirSync(directLoginDir, { recursive: true });
        fs.writeFileSync(path.join(directLoginDir, 'index.html'), content, 'utf8');
      } else if (baseName === 'admin-dashboard') {
        const adminDashDir = path.join(targetDir, 'admin', 'dashboard');
        fs.mkdirSync(adminDashDir, { recursive: true });
        fs.writeFileSync(path.join(adminDashDir, 'index.html'), content, 'utf8');

        const directDashDir = path.join(targetDir, 'admin-dashboard');
        fs.mkdirSync(directDashDir, { recursive: true });
        fs.writeFileSync(path.join(directDashDir, 'index.html'), content, 'utf8');
      } else {
        const subDir = path.join(targetDir, baseName);
        if (!fs.existsSync(subDir)) {
          fs.mkdirSync(subDir, { recursive: true });
        }
        fs.writeFileSync(path.join(subDir, 'index.html'), content, 'utf8');
      }
    }
  }

  // Admin root redirect: /admin/ -> /admin-login.html
  const adminDir = path.join(targetDir, 'admin');
  if (!fs.existsSync(adminDir)) {
    fs.mkdirSync(adminDir, { recursive: true });
  }
  const adminIndexRedirect = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/admin-login.html"><title>Redirecting to Admin Login...</title></head><body><p>Redirecting to <a href="/admin-login.html">Admin Login</a>...</p></body></html>`;
  fs.writeFileSync(path.join(adminDir, 'index.html'), adminIndexRedirect, 'utf8');

  console.log(`✓ Built secure static output with Clean URLs and Admin Portal in ${path.basename(targetDir)}/`);
}

console.log('✨ Build succeeded! Clean & secure distribution generated with directory-based clean routes.');
