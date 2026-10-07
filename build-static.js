import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '.');
const publicDir = path.resolve(rootDir, 'public');
const viewsDir = path.resolve(rootDir, 'views');
const distDir = path.resolve(rootDir, 'dist');

// Ensure clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// 1. Copy public assets (css, js, images) to dist/
const items = ['css', 'js', 'images'];
for (const item of items) {
  const src = path.join(publicDir, item);
  const dest = path.join(distDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log(`✓ Copied static assets: ${item}/ -> dist/${item}/`);
  }
}

// 2. Read and compile all views/*.html to dist/*.html with relative asset links
const viewFiles = fs.readdirSync(viewsDir).filter(f => f.endsWith('.html'));

for (const file of viewFiles) {
  let content = fs.readFileSync(path.join(viewsDir, file), 'utf8');

  content = content
    .split('href="/css/').join('href="css/')
    .split('href="/images/').join('href="images/')
    .split('src="/images/').join('src="images/')
    .split('src="/js/').join('src="js/')
    .split('href="/about"').join('href="about.html"')
    .split('href="/products"').join('href="products.html"')
    .split('href="/gallery"').join('href="gallery.html"')
    .split('href="/contact"').join('href="contact.html"')
    .split('href="/privacy"').join('href="privacy.html"')
    .split('href="/admin/login"').join('href="admin-login.html"')
    .split('href="/admin/dashboard"').join('href="admin-dashboard.html"')
    .split('href="/"').join('href="index.html"');

  const destFile = path.join(distDir, file);
  fs.writeFileSync(destFile, content, 'utf8');
  console.log(`✓ Compiled view: views/${file} -> dist/${file}`);
}

console.log('✨ Build succeeded! Clean distribution generated in dist/');
