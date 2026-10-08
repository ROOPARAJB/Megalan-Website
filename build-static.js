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

  // 2. Add .nojekyll for GitHub Pages
  fs.writeFileSync(path.join(targetDir, '.nojekyll'), '', 'utf8');

  // 3. Read and compile all views/*.html to target/*.html with relative asset links
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

    const destFile = path.join(targetDir, file);
    fs.writeFileSync(destFile, content, 'utf8');
  }

  console.log(`✓ Built static output in ${path.basename(targetDir)}/`);
}

console.log('✨ Build succeeded! Clean distribution generated for GitHub Pages & static hosting.');
