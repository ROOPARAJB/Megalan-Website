import express from 'express';
import db from '../../database/db.js';

const router = express.Router();

// GET /api/products
router.get('/', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT * FROM products ORDER BY sort_order ASC, id ASC
    `).all();
    return res.json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve product catalog.'
    });
  }
});

// GET /api/products/:slug
router.get('/:slug', (req, res) => {
  try {
    const product = db.prepare(`
      SELECT * FROM products WHERE slug = ?
    `).get(req.params.slug);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product variety not found.'
      });
    }

    return res.json({
      success: true,
      data: product
    });
  } catch (err) {
    console.error('Error fetching product by slug:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve product details.'
    });
  }
});

export default router;
