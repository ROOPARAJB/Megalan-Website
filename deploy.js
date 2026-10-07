import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');

console.log('🚀 Starting GitHub Pages deployment...');

// 1. Build static assets to dist/
execSync('node build-static.js', { stdio: 'inherit' });

// 2. Deploy dist folder to gh-pages branch
try {
  const gitRemote = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
  
  // Create a temporary git repo inside dist
  execSync('git init', { cwd: distDir, stdio: 'pipe' });
  execSync('git add -A', { cwd: distDir, stdio: 'pipe' });
  execSync('git commit -m "Deploy to GitHub Pages [skip ci]"', { cwd: distDir, stdio: 'pipe' });
  execSync(`git branch -M gh-pages`, { cwd: distDir, stdio: 'pipe' });
  execSync(`git push -f ${gitRemote} gh-pages`, { cwd: distDir, stdio: 'inherit' });
  
  // Clean up .git in dist
  fs.rmSync(path.join(distDir, '.git'), { recursive: true, force: true });
  console.log('✨ Successfully deployed dist/ to GitHub Pages (gh-pages branch)!');
} catch (err) {
  console.error('❌ Deployment error:', err.message);
  process.exit(1);
}
