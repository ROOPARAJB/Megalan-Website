import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');

console.log('🚀 Starting GitHub Pages deployment...');

// 1. Build static assets to dist/ and docs/
execSync('node build-static.js', { stdio: 'inherit' });

// 2. Deploy dist folder to gh-pages branch on all remotes
try {
  const remotesOutput = execSync('git remote', { encoding: 'utf8' }).trim();
  const remotes = remotesOutput.split(/\r?\n/).map(r => r.trim()).filter(Boolean);

  // Create temporary git repository inside dist/
  execSync('git init', { cwd: distDir, stdio: 'pipe' });
  execSync('git add -A', { cwd: distDir, stdio: 'pipe' });
  execSync('git commit -m "Deploy to GitHub Pages [skip ci]"', { cwd: distDir, stdio: 'pipe' });
  execSync('git branch -M gh-pages', { cwd: distDir, stdio: 'pipe' });

  for (const remote of remotes) {
    try {
      const url = execSync(`git config --get remote.${remote}.url`, { encoding: 'utf8' }).trim();
      console.log(`Pushing gh-pages to ${remote} (${url})...`);
      execSync(`git push -f ${url} gh-pages`, { cwd: distDir, stdio: 'inherit' });
      console.log(`✓ Pushed gh-pages to ${remote}`);
    } catch (e) {
      console.warn(`Warning: Could not push to remote ${remote}:`, e.message);
    }
  }

  // Clean up .git in dist
  fs.rmSync(path.join(distDir, '.git'), { recursive: true, force: true });
  console.log('✨ Successfully deployed dist/ to GitHub Pages (gh-pages branch) on all remotes!');
} catch (err) {
  console.error('❌ Deployment error:', err.message);
  process.exit(1);
}
