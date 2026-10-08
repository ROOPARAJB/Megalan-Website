import express from 'express';
import dbService from '../../database/db-service.js';

const router = express.Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const products = await dbService.getProducts();
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
router.get('/:slug', async (req, res) => {
  try {
    const product = await dbService.getProductBySlug(req.params.slug);

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
