import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuthPage } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const viewsDir = path.resolve(__dirname, '../../views');

const router = express.Router();

// Home Page
router.get('/', (req, res) => {
  res.sendFile(path.join(viewsDir, 'index.html'));
});

// About Us Page
router.get('/about', (req, res) => {
  res.sendFile(path.join(viewsDir, 'about.html'));
});

// Banana Products Catalog
router.get('/products', (req, res) => {
  res.sendFile(path.join(viewsDir, 'products.html'));
});

// Dynamic Photo Gallery
router.get('/gallery', (req, res) => {
  res.sendFile(path.join(viewsDir, 'gallery.html'));
});

// Contact Us & RFQ Page
router.get('/contact', (req, res) => {
  res.sendFile(path.join(viewsDir, 'contact.html'));
});

// Privacy Policy & Data Notice Page
router.get('/privacy', (req, res) => {
  res.sendFile(path.join(viewsDir, 'privacy.html'));
});

// Admin Login Page
router.get('/admin/login', (req, res) => {
  res.sendFile(path.join(viewsDir, 'admin-login.html'));
});

// Admin Protected Dashboard
router.get('/admin/dashboard', requireAuthPage, (req, res) => {
  res.sendFile(path.join(viewsDir, 'admin-dashboard.html'));
});

export default router;
