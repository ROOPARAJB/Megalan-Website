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

  // 1. Copy public assets (css, js, images) - strictly exclude admin.js
  const items = ['css', 'js', 'images'];
  for (const item of items) {
    const src = path.join(publicDir, item);
    const dest = path.join(targetDir, item);
    if (fs.existsSync(src)) {
      fs.cpSync(src, dest, { recursive: true, force: true });
    }
  }

  // CRITICAL SECURITY ENFORCEMENT: Strictly purge admin.js from public static distribution
  const destAdminJs = path.join(targetDir, 'js', 'admin.js');
  if (fs.existsSync(destAdminJs)) {
    fs.rmSync(destAdminJs, { force: true });
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

  // 4. Compile ONLY public views into clean-URL directory structures & fallback .html files
  // Exclude all admin views (admin-dashboard, admin-login) to prevent data & portal exposure on static mirrors
  const viewFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html') && !f.startsWith('admin'));

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

    // Write file.html at root of dist
    fs.writeFileSync(path.join(targetDir, file), content, 'utf8');

    // For clean directory routing (e.g., /about/index.html), create sub-folder unless it's index or 404
    if (baseName !== 'index' && baseName !== '404') {
      const subDir = path.join(targetDir, baseName);
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
      }
      fs.writeFileSync(path.join(subDir, 'index.html'), content, 'utf8');
    }
  }

  console.log(`✓ Built secure static public distribution (Zero admin exposure) in ${path.basename(targetDir)}/`);
}

console.log('✨ Build succeeded! Clean & secure public distribution generated with zero admin exposure.');
