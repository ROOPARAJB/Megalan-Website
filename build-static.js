import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '.');
const publicDir = path.resolve(rootDir, 'public');
const viewsDir = path.resolve(rootDir, 'views');

// 1. Copy css, js, images from public/ to root
const items = ['css', 'js', 'images'];
for (const item of items) {
  const src = path.join(publicDir, item);
  const dest = path.join(rootDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, force: true });
    console.log(`✓ Synchronized ${item}/`);
  }
}

// 2. Read and convert all views/*.html to root *.html for GitHub Pages
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

  const destFile = path.join(rootDir, file);
  fs.writeFileSync(destFile, content, 'utf8');
  console.log(`✓ Generated static page: ${file}`);
}

console.log('✨ Static site build complete for GitHub Pages!');
